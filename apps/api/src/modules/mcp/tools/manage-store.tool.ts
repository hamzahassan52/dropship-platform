import { Injectable } from '@nestjs/common';
import { StoresService } from '../../stores/stores.service';
import { StorePlatform } from '@prisma/client';

@Injectable()
export class ManageStoreTool {
  private readonly userId = 'default-user';

  constructor(private readonly storesService: StoresService) {}

  getToolDefinition() {
    return {
      name: 'manage_store',
      description: 'Add, remove, list, or update stores. Supports WooCommerce and Shopify stores.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'remove', 'list', 'toggle', 'stats'],
            description: 'Action to perform: add new store, remove store, list all stores, toggle active status, or get store stats.',
          },
          storeId: {
            type: 'string',
            description: 'Store ID (required for remove, toggle, stats actions).',
          },
          name: {
            type: 'string',
            description: 'Store name (required for add action).',
          },
          platform: {
            type: 'string',
            enum: ['WOOCOMMERCE', 'SHOPIFY'],
            description: 'Store platform (required for add action).',
          },
          storeUrl: {
            type: 'string',
            description: 'Store URL (required for add action). Example: https://mystore.com or mystore.myshopify.com',
          },
          consumerKey: {
            type: 'string',
            description: 'WooCommerce Consumer Key (required for WooCommerce stores).',
          },
          consumerSecret: {
            type: 'string',
            description: 'WooCommerce Consumer Secret (required for WooCommerce stores).',
          },
          accessToken: {
            type: 'string',
            description: 'Shopify Access Token (required for Shopify stores).',
          },
        },
        required: ['action'],
      },
    };
  }

  async execute(params: {
    action: 'add' | 'remove' | 'list' | 'toggle' | 'stats';
    storeId?: string;
    name?: string;
    platform?: 'WOOCOMMERCE' | 'SHOPIFY';
    storeUrl?: string;
    consumerKey?: string;
    consumerSecret?: string;
    accessToken?: string;
  }) {
    switch (params.action) {
      case 'list':
        return this.listStores();

      case 'add':
        return this.addStore(params);

      case 'remove':
        return this.removeStore(params.storeId);

      case 'toggle':
        return this.toggleStore(params.storeId);

      case 'stats':
        return this.getStoreStats(params.storeId);

      default:
        return { success: false, error: 'Invalid action' };
    }
  }

  private async listStores() {
    const stores = await this.storesService.getStores(this.userId);
    return {
      success: true,
      count: stores.length,
      stores: stores.map(s => ({
        id: s.id,
        name: s.name,
        platform: s.platform,
        url: s.storeUrl,
        active: s.isActive,
        orders: s.orderCount,
        products: s.productCount,
      })),
    };
  }

  private async addStore(params: {
    name?: string;
    platform?: 'WOOCOMMERCE' | 'SHOPIFY';
    storeUrl?: string;
    consumerKey?: string;
    consumerSecret?: string;
    accessToken?: string;
  }) {
    if (!params.name || !params.platform || !params.storeUrl) {
      return {
        success: false,
        error: 'Missing required fields: name, platform, storeUrl',
      };
    }

    // Build credentials based on platform
    let credentials: any = {};

    if (params.platform === 'WOOCOMMERCE') {
      if (!params.consumerKey || !params.consumerSecret) {
        return {
          success: false,
          error: 'WooCommerce requires consumerKey and consumerSecret',
        };
      }
      credentials = {
        woocommerce: {
          consumerKey: params.consumerKey,
          consumerSecret: params.consumerSecret,
        },
      };
    } else if (params.platform === 'SHOPIFY') {
      if (!params.accessToken) {
        return {
          success: false,
          error: 'Shopify requires accessToken',
        };
      }
      credentials = {
        shopify: {
          accessToken: params.accessToken,
        },
      };
    }

    const result = await this.storesService.addStore(this.userId, {
      name: params.name,
      platform: params.platform as StorePlatform,
      storeUrl: params.storeUrl,
      credentials,
    });

    if (result.success) {
      return {
        success: true,
        message: `Store "${params.name}" added successfully`,
        store: result.store,
      };
    }

    return result;
  }

  private async removeStore(storeId?: string) {
    if (!storeId) {
      return { success: false, error: 'Store ID required' };
    }

    const result = await this.storesService.removeStore(this.userId, storeId);
    return result;
  }

  private async toggleStore(storeId?: string) {
    if (!storeId) {
      return { success: false, error: 'Store ID required' };
    }

    const result = await this.storesService.toggleStoreStatus(this.userId, storeId);
    return result;
  }

  private async getStoreStats(storeId?: string) {
    if (!storeId) {
      return { success: false, error: 'Store ID required' };
    }

    const stats = await this.storesService.getStoreStats(this.userId, storeId);
    if (!stats) {
      return { success: false, error: 'Store not found' };
    }

    return {
      success: true,
      ...stats,
    };
  }
}
