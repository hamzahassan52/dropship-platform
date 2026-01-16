import { Injectable, OnModuleInit } from '@nestjs/common';
import { StoresService } from '../../stores/stores.service';
import { StorePlatform } from '@prisma/client';
import { PrismaService } from '../../../common/prisma.service';
import { WooCommerceService } from '../../../integrations/woocommerce/woocommerce.service';
import { ShopifyService } from '../../../integrations/shopify/shopify.service';

@Injectable()
export class ManageStoreTool implements OnModuleInit {
  private readonly userId = 'default-user';

  constructor(
    private readonly storesService: StoresService,
    private readonly prisma: PrismaService,
    private readonly wooCommerce: WooCommerceService,
    private readonly shopify: ShopifyService,
  ) {}

  async onModuleInit() {
    // Ensure default user exists
    await this.ensureDefaultUser();
  }

  private async ensureDefaultUser() {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: this.userId },
    });

    if (!existingUser) {
      await this.prisma.user.create({
        data: {
          id: this.userId,
          email: 'default@dropship.local',
          password: 'not-used',
          firstName: 'Default',
          lastName: 'User',
          name: 'Default User',
        },
      });
      console.log('[ManageStoreTool] Created default user');
    }
  }

  getToolDefinition() {
    return {
      name: 'manage_store',
      description: 'Add, remove, list, test, or update stores. Supports WooCommerce and Shopify stores.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['add', 'remove', 'list', 'toggle', 'stats', 'test'],
            description: 'Action to perform: add new store, remove store, list all stores, toggle active status, get store stats, or test connection before adding.',
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
    action: 'add' | 'remove' | 'list' | 'toggle' | 'stats' | 'test';
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

      case 'test':
        return this.testConnection(params);

      default:
        return { success: false, error: 'Invalid action' };
    }
  }

  /**
   * Test store connection before adding
   */
  private async testConnection(params: {
    platform?: 'WOOCOMMERCE' | 'SHOPIFY';
    storeUrl?: string;
    consumerKey?: string;
    consumerSecret?: string;
    accessToken?: string;
  }) {
    if (!params.platform || !params.storeUrl) {
      return {
        success: false,
        error: 'Missing required fields: platform, storeUrl',
      };
    }

    if (params.platform === 'WOOCOMMERCE') {
      if (!params.consumerKey || !params.consumerSecret) {
        return {
          success: false,
          error: 'WooCommerce requires consumerKey and consumerSecret',
        };
      }

      const result = await this.wooCommerce.testConnectionWithCredentials(
        params.storeUrl,
        params.consumerKey,
        params.consumerSecret,
      );

      return {
        success: result.success,
        message: result.message,
        storeInfo: result.storeInfo,
        platform: 'WOOCOMMERCE',
      };
    } else if (params.platform === 'SHOPIFY') {
      if (!params.accessToken) {
        return {
          success: false,
          error: 'Shopify requires accessToken',
        };
      }

      const result = await this.shopify.testConnectionWithDetails(
        params.storeUrl,
        params.accessToken,
      );

      return {
        success: result.success,
        message: result.message,
        storeInfo: result.storeInfo,
        platform: 'SHOPIFY',
      };
    }

    return { success: false, error: 'Invalid platform' };
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
