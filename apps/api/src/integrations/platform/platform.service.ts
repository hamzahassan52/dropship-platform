import { Injectable } from '@nestjs/common';
import { StorePlatform } from '@prisma/client';
import { WooCommerceService, WooOrder, WooProduct } from '../woocommerce/woocommerce.service';
import { ShopifyService, ShopifyOrder, ShopifyProduct } from '../shopify/shopify.service';
import { StoresService, StoreCredentials } from '../../modules/stores/stores.service';

// Unified order interface
export interface UnifiedOrder {
  id: string;
  externalId: string;
  storeId: string;
  storeName: string;
  platform: StorePlatform;
  orderNumber: string;
  status: string;
  fulfillmentStatus: string;
  customerEmail: string;
  customerName: string;
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
  lineItems: Array<{
    id: string;
    title: string;
    quantity: number;
    price: number;
    sku: string;
    productId: string;
  }>;
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: Date;
}

// Unified product interface
export interface UnifiedProduct {
  id: string;
  externalId: string;
  storeId: string;
  platform: StorePlatform;
  title: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  stock: number;
  images: string[];
  status: string;
}

@Injectable()
export class PlatformService {
  constructor(
    private wooCommerce: WooCommerceService,
    private shopify: ShopifyService,
    private storesService: StoresService,
  ) {}

  /**
   * Get pending orders from a specific store
   */
  async getPendingOrders(storeId: string): Promise<UnifiedOrder[]> {
    const storeData = await this.storesService.getStoreCredentials(storeId);
    if (!storeData) return [];

    if (storeData.platform === 'WOOCOMMERCE') {
      return this.getWooCommercePendingOrders(storeId, storeData);
    } else if (storeData.platform === 'SHOPIFY') {
      return this.getShopifyPendingOrders(storeId, storeData);
    }

    return [];
  }

  /**
   * Get pending orders from ALL active stores
   */
  async getAllPendingOrders(userId: string): Promise<UnifiedOrder[]> {
    const stores = await this.storesService.getActiveStores(userId);
    const allOrders: UnifiedOrder[] = [];

    for (const store of stores) {
      const orders = await this.getPendingOrders(store.id);
      allOrders.push(...orders);
    }

    // Sort by created date
    return allOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get single order
   */
  async getOrder(storeId: string, externalOrderId: string): Promise<UnifiedOrder | null> {
    const storeData = await this.storesService.getStoreCredentials(storeId);
    if (!storeData) return null;

    if (storeData.platform === 'WOOCOMMERCE') {
      const creds = storeData.credentials.woocommerce;
      if (!creds) return null;

      // Create temporary client
      const order = await this.wooCommerce.getOrder(parseInt(externalOrderId, 10));
      if (!order) return null;

      return this.mapWooOrder(order, storeId, 'WooCommerce Store');
    } else if (storeData.platform === 'SHOPIFY') {
      const creds = storeData.credentials.shopify;
      if (!creds) return null;

      const order = await this.shopify.getOrder(
        storeData.storeUrl,
        creds.accessToken,
        parseInt(externalOrderId, 10),
      );
      if (!order) return null;

      return this.mapShopifyOrder(order, storeId, 'Shopify Store');
    }

    return null;
  }

  /**
   * Fulfill order with tracking
   */
  async fulfillOrder(
    storeId: string,
    externalOrderId: string,
    trackingNumber: string,
    carrier: string = 'CJ Dropshipping',
  ): Promise<boolean> {
    const storeData = await this.storesService.getStoreCredentials(storeId);
    if (!storeData) return false;

    if (storeData.platform === 'WOOCOMMERCE') {
      const creds = storeData.credentials.woocommerce;
      if (!creds) return false;

      return this.wooCommerce.addTrackingToOrder(
        parseInt(externalOrderId, 10),
        trackingNumber,
        carrier,
      );
    } else if (storeData.platform === 'SHOPIFY') {
      const creds = storeData.credentials.shopify;
      if (!creds) return false;

      return this.shopify.fulfillOrder(
        storeData.storeUrl,
        creds.accessToken,
        parseInt(externalOrderId, 10),
        trackingNumber,
        carrier,
      );
    }

    return false;
  }

  /**
   * Get products from store
   */
  async getProducts(storeId: string, limit: number = 50): Promise<UnifiedProduct[]> {
    const storeData = await this.storesService.getStoreCredentials(storeId);
    if (!storeData) return [];

    if (storeData.platform === 'WOOCOMMERCE') {
      const products = await this.wooCommerce.getProducts({ per_page: limit });
      return products.map(p => this.mapWooProduct(p, storeId));
    } else if (storeData.platform === 'SHOPIFY') {
      const creds = storeData.credentials.shopify;
      if (!creds) return [];

      const products = await this.shopify.getProducts(
        storeData.storeUrl,
        creds.accessToken,
        { limit },
      );
      return products.map(p => this.mapShopifyProduct(p, storeId));
    }

    return [];
  }

  /**
   * Test store connection
   */
  async testConnection(storeId: string): Promise<{ success: boolean; message: string }> {
    const storeData = await this.storesService.getStoreCredentials(storeId);
    if (!storeData) {
      return { success: false, message: 'Store not found' };
    }

    if (storeData.platform === 'WOOCOMMERCE') {
      const connected = await this.wooCommerce.testConnection();
      return {
        success: connected,
        message: connected ? 'WooCommerce connected' : 'WooCommerce connection failed',
      };
    } else if (storeData.platform === 'SHOPIFY') {
      const creds = storeData.credentials.shopify;
      if (!creds) {
        return { success: false, message: 'Shopify credentials missing' };
      }

      const connected = await this.shopify.testConnection(storeData.storeUrl, creds.accessToken);
      return {
        success: connected,
        message: connected ? 'Shopify connected' : 'Shopify connection failed',
      };
    }

    return { success: false, message: 'Unsupported platform' };
  }

  // ============ PRIVATE MAPPERS ============

  private async getWooCommercePendingOrders(
    storeId: string,
    storeData: { platform: StorePlatform; storeUrl: string; credentials: StoreCredentials },
  ): Promise<UnifiedOrder[]> {
    const orders = await this.wooCommerce.getPendingOrders();
    return orders.map(order => this.mapWooOrder(order, storeId, 'WooCommerce'));
  }

  private async getShopifyPendingOrders(
    storeId: string,
    storeData: { platform: StorePlatform; storeUrl: string; credentials: StoreCredentials },
  ): Promise<UnifiedOrder[]> {
    const creds = storeData.credentials.shopify;
    if (!creds) return [];

    const orders = await this.shopify.getPendingOrders(storeData.storeUrl, creds.accessToken);
    return orders.map(order => this.mapShopifyOrder(order, storeId, 'Shopify'));
  }

  private mapWooOrder(order: WooOrder, storeId: string, storeName: string): UnifiedOrder {
    return {
      id: `woo-${order.id}`,
      externalId: String(order.id),
      storeId,
      storeName,
      platform: 'WOOCOMMERCE',
      orderNumber: `#${order.id}`,
      status: order.status,
      fulfillmentStatus: order.status === 'processing' ? 'unfulfilled' : order.status,
      customerEmail: order.billing.email || '',
      customerName: `${order.billing.first_name} ${order.billing.last_name}`,
      shippingAddress: {
        name: `${order.shipping.first_name} ${order.shipping.last_name}`,
        address1: order.shipping.address_1,
        address2: order.shipping.address_2,
        city: order.shipping.city,
        state: order.shipping.state,
        postalCode: order.shipping.postcode,
        country: order.shipping.country,
        phone: order.shipping.phone || order.billing.phone,
      },
      lineItems: order.line_items.map(item => ({
        id: String(item.id),
        title: item.name,
        quantity: item.quantity,
        price: parseFloat(item.price),
        sku: item.sku,
        productId: String(item.product_id),
      })),
      subtotal: parseFloat(order.total),
      shippingCost: 0,
      total: parseFloat(order.total),
      createdAt: new Date(order.date_created),
    };
  }

  private mapShopifyOrder(order: ShopifyOrder, storeId: string, storeName: string): UnifiedOrder {
    return {
      id: `shopify-${order.id}`,
      externalId: String(order.id),
      storeId,
      storeName,
      platform: 'SHOPIFY',
      orderNumber: order.name,
      status: order.financial_status,
      fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
      customerEmail: order.email,
      customerName: order.shipping_address
        ? `${order.shipping_address.first_name} ${order.shipping_address.last_name}`
        : '',
      shippingAddress: order.shipping_address
        ? {
            name: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
            address1: order.shipping_address.address1,
            address2: order.shipping_address.address2 || undefined,
            city: order.shipping_address.city,
            state: order.shipping_address.province,
            postalCode: order.shipping_address.zip,
            country: order.shipping_address.country_code,
            phone: order.shipping_address.phone || undefined,
          }
        : {
            name: '',
            address1: '',
            city: '',
            state: '',
            postalCode: '',
            country: '',
          },
      lineItems: order.line_items.map(item => ({
        id: String(item.id),
        title: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
        sku: item.sku,
        productId: String(item.product_id),
      })),
      subtotal: parseFloat(order.subtotal_price),
      shippingCost: parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0'),
      total: parseFloat(order.total_price),
      createdAt: new Date(order.created_at),
    };
  }

  private mapWooProduct(product: WooProduct, storeId: string): UnifiedProduct {
    return {
      id: `woo-${product.id}`,
      externalId: String(product.id),
      storeId,
      platform: 'WOOCOMMERCE',
      title: product.name,
      description: undefined,
      price: parseFloat(product.price),
      compareAtPrice: product.regular_price ? parseFloat(product.regular_price) : undefined,
      sku: product.sku,
      stock: product.stock_quantity || 0,
      images: product.images.map(img => img.src),
      status: product.status,
    };
  }

  private mapShopifyProduct(product: ShopifyProduct, storeId: string): UnifiedProduct {
    const variant = product.variants[0];
    return {
      id: `shopify-${product.id}`,
      externalId: String(product.id),
      storeId,
      platform: 'SHOPIFY',
      title: product.title,
      description: product.body_html,
      price: variant ? parseFloat(variant.price) : 0,
      compareAtPrice: undefined,
      sku: variant?.sku || '',
      stock: variant?.inventory_quantity || 0,
      images: product.images.map(img => img.src),
      status: product.status,
    };
  }
}
