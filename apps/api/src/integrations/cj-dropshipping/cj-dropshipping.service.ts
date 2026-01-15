import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import type { Product, ProductSearchParams } from '@dropship/types';

@Injectable()
export class CjDropshippingService {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private simulationMode: boolean;

  constructor(private configService: ConfigService) {
    this.client = axios.create({
      baseURL: 'https://developers.cjdropshipping.com/api2.0/v1',
      timeout: 30000,
    });
    this.simulationMode = this.configService.get('CJ_SIMULATION_MODE') === 'true';
  }

  /**
   * Check if simulation mode is enabled
   */
  isSimulationMode(): boolean {
    return this.simulationMode;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken !== null) {
      return this.accessToken;
    }

    const email = this.configService.get<string>('CJ_EMAIL');
    const password = this.configService.get<string>('CJ_PASSWORD');

    if (!email || !password) {
      throw new Error('CJ Dropshipping credentials not configured');
    }

    const response = await this.client.post('/authentication/getAccessToken', {
      email,
      password,
    });

    if (response.data.result && response.data.data?.accessToken) {
      const token: string = response.data.data.accessToken;
      this.accessToken = token;
      return token;
    }

    throw new Error('Failed to get CJ access token');
  }

  async searchProducts(params: ProductSearchParams): Promise<Product[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get('/product/list', {
        headers: { 'CJ-Access-Token': token },
        params: {
          productNameEn: params.query,
          pageNum: params.page || 1,
          pageSize: Math.min(params.limit || 20, 100),
        },
      });

      if (!response.data.result || !response.data.data?.list) {
        return [];
      }

      return response.data.data.list.map((item: CJProductResponse) =>
        this.mapToProduct(item),
      );
    } catch {
      return [];
    }
  }

  async getProductDetails(productId: string): Promise<Product | null> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get('/product/query', {
        headers: { 'CJ-Access-Token': token },
        params: { pid: productId },
      });

      if (!response.data.result || !response.data.data) {
        return null;
      }

      return this.mapToProduct(response.data.data);
    } catch {
      return null;
    }
  }

  async getCategories(): Promise<CJCategory[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get('/product/getCategory', {
        headers: { 'CJ-Access-Token': token },
      });

      return response.data.data || [];
    } catch {
      return [];
    }
  }

  // ============ ORDER MANAGEMENT ============

  /**
   * Place order on CJ Dropshipping (with simulation support)
   */
  async placeOrder(
    orderData: CJOrderRequest,
    options?: { forceSimulation?: boolean },
  ): Promise<CJOrderPlacementResult> {
    const simulate = options?.forceSimulation ?? this.simulationMode;

    if (simulate) {
      return this.simulatePlaceOrder(orderData);
    }

    try {
      const token = await this.getAccessToken();

      const response = await this.client.post(
        '/shopping/order/createOrder',
        {
          orderNumber: orderData.orderNumber,
          shippingZip: orderData.shippingAddress.postalCode,
          shippingCountryCode: orderData.shippingAddress.country,
          shippingCountry: orderData.shippingAddress.country,
          shippingProvince: orderData.shippingAddress.state,
          shippingCity: orderData.shippingAddress.city,
          shippingAddress: orderData.shippingAddress.address1,
          shippingAddress2: orderData.shippingAddress.address2 || '',
          shippingCustomerName: orderData.shippingAddress.name,
          shippingPhone: orderData.shippingAddress.phone || '',
          products: orderData.items.map(item => ({
            vid: item.cjProductId,
            quantity: item.quantity,
          })),
        },
        { headers: { 'CJ-Access-Token': token } },
      );

      if (response.data.result && response.data.data?.orderId) {
        return {
          success: true,
          cjOrderId: response.data.data.orderId,
          error: null,
          simulated: false,
        };
      }

      return {
        success: false,
        cjOrderId: null,
        error: response.data.message || 'CJ API returned no order ID',
        simulated: false,
      };
    } catch (error) {
      return {
        success: false,
        cjOrderId: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        simulated: false,
      };
    }
  }

  /**
   * Simulate CJ order placement for testing (no actual charges)
   */
  private async simulatePlaceOrder(orderData: CJOrderRequest): Promise<CJOrderPlacementResult> {
    const simulatedOrderId = `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('[CJ SIMULATION] Order placed:', {
      orderNumber: orderData.orderNumber,
      simulatedOrderId,
      items: orderData.items.length,
      country: orderData.shippingAddress.country,
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      success: true,
      cjOrderId: simulatedOrderId,
      error: null,
      simulated: true,
      simulationDetails: {
        orderNumber: orderData.orderNumber,
        itemCount: orderData.items.length,
        shippingCountry: orderData.shippingAddress.country,
      },
    };
  }

  /**
   * Get order tracking information (with simulation support)
   */
  async getOrderTracking(
    cjOrderId: string,
    options?: { forceSimulation?: boolean },
  ): Promise<CJTrackingInfo | null> {
    const simulate = options?.forceSimulation ?? this.simulationMode;

    // Check if this is a simulated order
    if (simulate || cjOrderId.startsWith('SIM-')) {
      return this.simulateGetTracking(cjOrderId);
    }

    try {
      const token = await this.getAccessToken();

      const response = await this.client.get('/shopping/order/getOrderDetail', {
        headers: { 'CJ-Access-Token': token },
        params: { orderId: cjOrderId },
      });

      if (response.data.result && response.data.data) {
        const orderData = response.data.data;
        return {
          orderId: cjOrderId,
          status: orderData.orderStatus,
          trackingNumber: orderData.trackingNumber || null,
          carrier: orderData.logisticName || 'CJ Logistics',
          shippedAt: orderData.shippingTime || null,
          simulated: false,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Simulate tracking retrieval for test orders
   */
  private async simulateGetTracking(cjOrderId: string): Promise<CJTrackingInfo> {
    // Parse order creation time from ID
    const orderTimestamp = cjOrderId.startsWith('SIM-')
      ? parseInt(cjOrderId.split('-')[1])
      : Date.now();

    const orderAge = Date.now() - orderTimestamp;
    const minutesSinceOrder = orderAge / (1000 * 60);

    // Simulate realistic tracking progression (faster for testing)
    let status = 'CREATED';
    let trackingNumber: string | null = null;
    let shippedAt: string | null = null;

    if (minutesSinceOrder > 1) {
      status = 'PROCESSING';
    }
    if (minutesSinceOrder > 2) {
      status = 'SHIPPED';
      trackingNumber = `SIMTRK${Math.random().toString(36).substr(2, 12).toUpperCase()}`;
      shippedAt = new Date(orderTimestamp + 2 * 60 * 1000).toISOString();
    }
    if (minutesSinceOrder > 10) {
      status = 'DELIVERED';
    }

    console.log('[CJ SIMULATION] Tracking fetched:', {
      orderId: cjOrderId,
      status,
      trackingNumber,
      minutesSinceOrder: Math.round(minutesSinceOrder),
    });

    return {
      orderId: cjOrderId,
      status,
      trackingNumber,
      carrier: 'CJ Simulation Carrier',
      shippedAt,
      simulated: true,
    };
  }

  /**
   * Get all orders from CJ
   */
  async getOrders(params?: {
    status?: string;
    pageNum?: number;
    pageSize?: number;
  }): Promise<CJOrderInfo[]> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get('/shopping/order/list', {
        headers: { 'CJ-Access-Token': token },
        params: {
          pageNum: params?.pageNum || 1,
          pageSize: params?.pageSize || 50,
          orderStatus: params?.status,
        },
      });

      if (response.data.result && response.data.data?.list) {
        return response.data.data.list;
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Calculate shipping cost
   */
  async calculateShipping(
    productId: string,
    quantity: number,
    countryCode: string,
  ): Promise<number> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.post(
        '/logistic/freightCalculate',
        {
          startCountryCode: 'CN',
          endCountryCode: countryCode,
          products: [{ vid: productId, quantity }],
        },
        { headers: { 'CJ-Access-Token': token } },
      );

      if (response.data.result && response.data.data?.length > 0) {
        // Return cheapest shipping option
        const cheapest = response.data.data.reduce(
          (min: any, curr: any) =>
            parseFloat(curr.logisticPrice) < parseFloat(min.logisticPrice) ? curr : min,
          response.data.data[0],
        );
        return parseFloat(cheapest.logisticPrice) || 0;
      }

      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Check product stock availability
   */
  async checkStock(productId: string): Promise<{ inStock: boolean; quantity: number }> {
    try {
      const product = await this.getProductDetails(productId);
      if (!product) {
        return { inStock: false, quantity: 0 };
      }
      // CJ doesn't provide exact stock, but if product exists, it's generally available
      return { inStock: true, quantity: 999 };
    } catch (error) {
      return { inStock: false, quantity: 0 };
    }
  }

  private mapToProduct(cjProduct: CJProductResponse): Product {
    return {
      id: cjProduct.pid,
      externalId: cjProduct.pid,
      source: 'CJ_DROPSHIPPING',
      title: cjProduct.productNameEn || cjProduct.productName,
      description: cjProduct.description,
      images: cjProduct.productImage ? [cjProduct.productImage] : [],
      supplierPrice: parseFloat(cjProduct.sellPrice) || 0,
      shippingCost: 0, // Will be calculated separately
      category: cjProduct.categoryName,
      supplierId: cjProduct.supplierId || 'cj',
      rating: undefined,
      orderCount: cjProduct.listedNum || 0,
      createdAt: new Date(),
    };
  }
}

// CJ API Response Types
interface CJProductResponse {
  pid: string;
  productName: string;
  productNameEn: string;
  description?: string;
  productImage?: string;
  sellPrice: string;
  categoryName?: string;
  supplierId?: string;
  listedNum?: number;
}

interface CJCategory {
  categoryId: string;
  categoryName: string;
  categoryNameEn: string;
}

// Order Types
export interface CJOrderRequest {
  orderNumber: string;
  shippingAddress: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  items: Array<{
    sku: string;
    quantity: number;
    cjProductId: string;
  }>;
}

export interface CJTrackingInfo {
  orderId: string;
  status: string;
  trackingNumber: string | null;
  carrier: string;
  shippedAt: string | null;
  simulated?: boolean;
}

export interface CJOrderPlacementResult {
  success: boolean;
  cjOrderId: string | null;
  error: string | null;
  simulated: boolean;
  simulationDetails?: {
    orderNumber: string;
    itemCount: number;
    shippingCountry: string;
  };
}

export interface CJOrderInfo {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  createDate: string;
  trackingNumber?: string;
  logisticName?: string;
}
