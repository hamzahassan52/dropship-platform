import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface WooOrder {
  id: number;
  status: string;
  currency: string;
  total: string;
  customer_id: number;
  billing: WooAddress;
  shipping: WooAddress;
  line_items: WooLineItem[];
  date_created: string;
  date_modified: string;
  payment_method: string;
  transaction_id: string;
}

export interface WooAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

export interface WooLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  price: string;
  sku: string;
  meta_data: Array<{ key: string; value: string }>;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  status: string;
  price: string;
  regular_price: string;
  sale_price: string;
  sku: string;
  stock_quantity: number;
  stock_status: string;
  images: Array<{ id: number; src: string }>;
  categories: Array<{ id: number; name: string }>;
}

@Injectable()
export class WooCommerceService {
  private client!: AxiosInstance;
  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    const storeUrl = this.configService.get<string>('WOOCOMMERCE_STORE_URL');
    const consumerKey = this.configService.get<string>('WOOCOMMERCE_CONSUMER_KEY');
    const consumerSecret = this.configService.get<string>('WOOCOMMERCE_CONSUMER_SECRET');

    if (storeUrl && consumerKey && consumerSecret) {
      this.client = axios.create({
        baseURL: `${storeUrl}/wp-json/wc/v3`,
        auth: {
          username: consumerKey,
          password: consumerSecret,
        },
        timeout: 30000,
      });
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
    }
  }

  // ============ ORDERS ============

  /**
   * Get all orders with optional filters
   */
  async getOrders(params?: {
    status?: string;
    per_page?: number;
    page?: number;
    after?: string;
    before?: string;
  }): Promise<WooOrder[]> {
    if (!this.isConfigured) return [];

    try {
      const response = await this.client.get('/orders', { params });
      return response.data;
    } catch {
      return [];
    }
  }

  /**
   * Get pending orders (ready for fulfillment)
   */
  async getPendingOrders(): Promise<WooOrder[]> {
    return this.getOrders({ status: 'processing', per_page: 100 });
  }

  /**
   * Get single order by ID
   */
  async getOrder(orderId: number): Promise<WooOrder | null> {
    if (!this.isConfigured) return null;

    try {
      const response = await this.client.get(`/orders/${orderId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: number,
    status: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed',
  ): Promise<WooOrder | null> {
    if (!this.isConfigured) return null;

    try {
      const response = await this.client.put(`/orders/${orderId}`, { status });
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Add tracking info to order (via order note)
   */
  async addTrackingToOrder(
    orderId: number,
    trackingNumber: string,
    carrier: string = 'CJ Dropshipping',
  ): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      // Add order note with tracking info
      await this.client.post(`/orders/${orderId}/notes`, {
        note: `Shipment tracking: ${trackingNumber}\nCarrier: ${carrier}\nTrack: https://t.17track.net/en#nums=${trackingNumber}`,
        customer_note: true, // Customer will see this
      });

      // Update order status to completed
      await this.updateOrderStatus(orderId, 'completed');

      return true;
    } catch {
      return false;
    }
  }

  // ============ PRODUCTS ============

  /**
   * Get all products
   */
  async getProducts(params?: {
    per_page?: number;
    page?: number;
    category?: number;
    status?: string;
  }): Promise<WooProduct[]> {
    if (!this.isConfigured) return [];

    try {
      const response = await this.client.get('/products', { params });
      return response.data;
    } catch {
      return [];
    }
  }

  /**
   * Get single product
   */
  async getProduct(productId: number): Promise<WooProduct | null> {
    if (!this.isConfigured) return null;

    try {
      const response = await this.client.get(`/products/${productId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Create new product
   */
  async createProduct(productData: {
    name: string;
    type?: string;
    regular_price: string;
    description?: string;
    short_description?: string;
    sku?: string;
    images?: Array<{ src: string }>;
    categories?: Array<{ id: number }>;
    manage_stock?: boolean;
    stock_quantity?: number;
    meta_data?: Array<{ key: string; value: string }>;
  }): Promise<WooProduct | null> {
    if (!this.isConfigured) return null;

    try {
      const response = await this.client.post('/products', {
        ...productData,
        type: productData.type || 'simple',
        status: 'publish',
      });
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Update product stock
   */
  async updateProductStock(
    productId: number,
    quantity: number,
  ): Promise<WooProduct | null> {
    if (!this.isConfigured) return null;

    try {
      const response = await this.client.put(`/products/${productId}`, {
        stock_quantity: quantity,
        manage_stock: true,
      });
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Disable/hide product (when out of stock at CJ)
   */
  async disableProduct(productId: number): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      await this.client.put(`/products/${productId}`, {
        status: 'draft',
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============ CUSTOMERS ============

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: number): Promise<any> {
    if (!this.isConfigured) return null;

    try {
      const response = await this.client.get(`/customers/${customerId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  // ============ STATS ============

  /**
   * Get sales report
   */
  async getSalesReport(period: 'week' | 'month' | 'year' = 'month'): Promise<any> {
    if (!this.isConfigured) return null;

    try {
      const response = await this.client.get('/reports/sales', {
        params: { period },
      });
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get order count by status
   */
  async getOrderCounts(): Promise<Record<string, number>> {
    if (!this.isConfigured) return {};

    try {
      const response = await this.client.get('/reports/orders/totals');
      const counts: Record<string, number> = {};
      for (const item of response.data) {
        counts[item.slug] = item.total;
      }
      return counts;
    } catch {
      return {};
    }
  }

  // ============ UTILITY ============

  /**
   * Check if WooCommerce is connected
   */
  isConnected(): boolean {
    return this.isConfigured;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      await this.client.get('/system_status');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test connection with custom credentials
   */
  async testConnectionWithCredentials(
    storeUrl: string,
    consumerKey: string,
    consumerSecret: string,
  ): Promise<{ success: boolean; message: string; storeInfo?: { name: string; version: string } }> {
    try {
      // Normalize URL
      let baseUrl = storeUrl.trim().toLowerCase();
      if (!baseUrl.startsWith('http')) {
        baseUrl = 'https://' + baseUrl;
      }
      baseUrl = baseUrl.replace(/\/$/, '');

      const testClient = axios.create({
        baseURL: `${baseUrl}/wp-json/wc/v3`,
        auth: {
          username: consumerKey,
          password: consumerSecret,
        },
        timeout: 15000,
      });

      const response = await testClient.get('/system_status');
      const data = response.data;

      return {
        success: true,
        message: 'Connection successful',
        storeInfo: {
          name: data?.settings?.store_name || data?.environment?.site_title || 'Unknown',
          version: data?.environment?.version || 'Unknown',
        },
      };
    } catch (error: any) {
      let message = 'Connection failed';
      if (error?.response?.status === 401) {
        message = 'Invalid API credentials';
      } else if (error?.response?.status === 404) {
        message = 'WooCommerce REST API not found. Make sure WooCommerce is installed.';
      } else if (error?.code === 'ENOTFOUND') {
        message = 'Store URL not reachable. Check the URL.';
      } else if (error?.code === 'ECONNREFUSED') {
        message = 'Connection refused. Check if the store is online.';
      } else if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED') {
        message = 'Connection timed out. Store may be slow or offline.';
      } else if (error?.message) {
        message = error.message;
      }

      return { success: false, message };
    }
  }
}
