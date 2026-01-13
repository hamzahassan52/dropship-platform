import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import type { Product, ProductSearchParams } from '@dropship/types';

@Injectable()
export class CjDropshippingService {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor(private configService: ConfigService) {
    this.client = axios.create({
      baseURL: 'https://developers.cjdropshipping.com/api2.0/v1',
      timeout: 30000,
    });
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
   * Place order on CJ Dropshipping
   */
  async placeOrder(orderData: CJOrderRequest): Promise<string | null> {
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
        return response.data.data.orderId;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get order tracking information
   */
  async getOrderTracking(cjOrderId: string): Promise<CJTrackingInfo | null> {
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
        };
      }

      return null;
    } catch {
      return null;
    }
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
}

export interface CJOrderInfo {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  createDate: string;
  trackingNumber?: string;
  logisticName?: string;
}
