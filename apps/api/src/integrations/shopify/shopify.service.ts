import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface ShopifyOrder {
  id: number;
  name: string;
  order_number: number;
  email: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  subtotal_price: string;
  total_shipping_price_set: {
    shop_money: { amount: string };
  };
  shipping_address: ShopifyAddress;
  billing_address: ShopifyAddress;
  line_items: ShopifyLineItem[];
  created_at: string;
  updated_at: string;
}

export interface ShopifyAddress {
  first_name: string;
  last_name: string;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  province: string;
  province_code: string;
  country: string;
  country_code: string;
  zip: string;
  phone: string | null;
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string;
  variant_id: number;
  product_id: number;
  properties: Array<{ name: string; value: string }>;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  status: string;
  variants: ShopifyVariant[];
  images: Array<{ id: number; src: string }>;
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string;
  inventory_quantity: number;
  inventory_management: string | null;
}

@Injectable()
export class ShopifyService {
  private createClient(storeUrl: string, accessToken: string): AxiosInstance {
    // Extract shop name from URL
    const shopDomain = storeUrl.replace('https://', '').replace('http://', '').replace(/\/$/, '');

    return axios.create({
      baseURL: `https://${shopDomain}/admin/api/2024-01`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  // ============ ORDERS ============

  async getOrders(
    storeUrl: string,
    accessToken: string,
    params?: {
      status?: string;
      fulfillment_status?: string;
      limit?: number;
    },
  ): Promise<ShopifyOrder[]> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      const response = await client.get('/orders.json', {
        params: {
          status: params?.status || 'any',
          fulfillment_status: params?.fulfillment_status,
          limit: params?.limit || 50,
        },
      });
      return response.data.orders || [];
    } catch {
      return [];
    }
  }

  async getPendingOrders(storeUrl: string, accessToken: string): Promise<ShopifyOrder[]> {
    return this.getOrders(storeUrl, accessToken, {
      fulfillment_status: 'unfulfilled',
      status: 'open',
    });
  }

  async getOrder(
    storeUrl: string,
    accessToken: string,
    orderId: number,
  ): Promise<ShopifyOrder | null> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      const response = await client.get(`/orders/${orderId}.json`);
      return response.data.order || null;
    } catch {
      return null;
    }
  }

  async fulfillOrder(
    storeUrl: string,
    accessToken: string,
    orderId: number,
    trackingNumber: string,
    trackingCompany: string = 'Other',
    trackingUrl?: string,
  ): Promise<boolean> {
    try {
      const client = this.createClient(storeUrl, accessToken);

      // Get fulfillment order
      const fulfillmentOrdersRes = await client.get(`/orders/${orderId}/fulfillment_orders.json`);
      const fulfillmentOrders = fulfillmentOrdersRes.data.fulfillment_orders || [];

      if (fulfillmentOrders.length === 0) return false;

      const fulfillmentOrderId = fulfillmentOrders[0].id;
      const lineItems = fulfillmentOrders[0].line_items.map((item: any) => ({
        id: item.id,
        quantity: item.fulfillable_quantity,
      }));

      // Create fulfillment
      await client.post('/fulfillments.json', {
        fulfillment: {
          line_items_by_fulfillment_order: [
            {
              fulfillment_order_id: fulfillmentOrderId,
              fulfillment_order_line_items: lineItems,
            },
          ],
          tracking_info: {
            number: trackingNumber,
            company: trackingCompany,
            url: trackingUrl || `https://t.17track.net/en#nums=${trackingNumber}`,
          },
          notify_customer: true,
        },
      });

      return true;
    } catch {
      return false;
    }
  }

  async cancelOrder(
    storeUrl: string,
    accessToken: string,
    orderId: number,
    reason?: string,
  ): Promise<boolean> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      await client.post(`/orders/${orderId}/cancel.json`, {
        reason: reason || 'other',
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============ PRODUCTS ============

  async getProducts(
    storeUrl: string,
    accessToken: string,
    params?: {
      limit?: number;
      status?: string;
    },
  ): Promise<ShopifyProduct[]> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      const response = await client.get('/products.json', {
        params: {
          limit: params?.limit || 50,
          status: params?.status || 'active',
        },
      });
      return response.data.products || [];
    } catch {
      return [];
    }
  }

  async getProduct(
    storeUrl: string,
    accessToken: string,
    productId: number,
  ): Promise<ShopifyProduct | null> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      const response = await client.get(`/products/${productId}.json`);
      return response.data.product || null;
    } catch {
      return null;
    }
  }

  async createProduct(
    storeUrl: string,
    accessToken: string,
    productData: {
      title: string;
      body_html?: string;
      vendor?: string;
      product_type?: string;
      variants: Array<{
        price: string;
        sku?: string;
        inventory_quantity?: number;
        inventory_management?: string;
      }>;
      images?: Array<{ src: string }>;
    },
  ): Promise<ShopifyProduct | null> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      const response = await client.post('/products.json', {
        product: {
          ...productData,
          status: 'active',
        },
      });
      return response.data.product || null;
    } catch {
      return null;
    }
  }

  async updateProductStock(
    storeUrl: string,
    accessToken: string,
    inventoryItemId: number,
    quantity: number,
  ): Promise<boolean> {
    try {
      const client = this.createClient(storeUrl, accessToken);

      // Get location
      const locationsRes = await client.get('/locations.json');
      const locationId = locationsRes.data.locations?.[0]?.id;

      if (!locationId) return false;

      await client.post('/inventory_levels/set.json', {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: quantity,
      });

      return true;
    } catch {
      return false;
    }
  }

  async updateProductStatus(
    storeUrl: string,
    accessToken: string,
    productId: number,
    status: 'active' | 'draft' | 'archived',
  ): Promise<boolean> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      await client.put(`/products/${productId}.json`, {
        product: { status },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============ CUSTOMERS ============

  async getCustomer(
    storeUrl: string,
    accessToken: string,
    customerId: number,
  ): Promise<any> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      const response = await client.get(`/customers/${customerId}.json`);
      return response.data.customer || null;
    } catch {
      return null;
    }
  }

  // ============ STATS ============

  async getOrderCount(
    storeUrl: string,
    accessToken: string,
    status?: string,
  ): Promise<number> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      const response = await client.get('/orders/count.json', {
        params: { status: status || 'any' },
      });
      return response.data.count || 0;
    } catch {
      return 0;
    }
  }

  async getProductCount(storeUrl: string, accessToken: string): Promise<number> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      const response = await client.get('/products/count.json');
      return response.data.count || 0;
    } catch {
      return 0;
    }
  }

  // ============ UTILITY ============

  async testConnection(storeUrl: string, accessToken: string): Promise<boolean> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      await client.get('/shop.json');
      return true;
    } catch {
      return false;
    }
  }

  async getShopInfo(storeUrl: string, accessToken: string): Promise<any> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      const response = await client.get('/shop.json');
      return response.data.shop || null;
    } catch {
      return null;
    }
  }

  /**
   * Test connection with detailed response
   */
  async testConnectionWithDetails(
    storeUrl: string,
    accessToken: string,
  ): Promise<{ success: boolean; message: string; storeInfo?: { name: string; domain: string } }> {
    try {
      const client = this.createClient(storeUrl, accessToken);
      const response = await client.get('/shop.json');
      const shop = response.data.shop;

      return {
        success: true,
        message: 'Connection successful',
        storeInfo: {
          name: shop?.name || 'Unknown',
          domain: shop?.domain || storeUrl,
        },
      };
    } catch (error: any) {
      let message = 'Connection failed';
      if (error?.response?.status === 401) {
        message = 'Invalid access token';
      } else if (error?.response?.status === 404) {
        message = 'Store not found. Check the URL.';
      } else if (error?.code === 'ENOTFOUND') {
        message = 'Store URL not reachable. Check the URL.';
      } else if (error?.message) {
        message = error.message;
      }

      return { success: false, message };
    }
  }
}
