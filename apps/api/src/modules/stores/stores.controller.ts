import { Controller, Get, Post, Put, Delete, Body, Param, Query, Inject, forwardRef } from '@nestjs/common';
import { StoresService, CreateStoreDto, UpdateStoreDto } from './stores.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { ShopifyService } from '../../integrations/shopify/shopify.service';
import { WebhookSetupService } from '../webhooks/webhook-setup.service';

@Controller('stores')
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly wooCommerce: WooCommerceService,
    private readonly shopify: ShopifyService,
    @Inject(forwardRef(() => WebhookSetupService))
    private readonly webhookSetupService: WebhookSetupService,
  ) {}

  // For now, using a default user ID. In production, get from auth token
  private getUserId(): string {
    return 'default-user';
  }

  @Post()
  async addStore(@Body() data: CreateStoreDto) {
    return this.storesService.addStore(this.getUserId(), data);
  }

  @Get()
  async getStores() {
    return this.storesService.getStores(this.getUserId());
  }

  @Get(':storeId')
  async getStore(@Param('storeId') storeId: string) {
    return this.storesService.getStore(this.getUserId(), storeId);
  }

  @Put(':storeId')
  async updateStore(
    @Param('storeId') storeId: string,
    @Body() data: UpdateStoreDto,
  ) {
    return this.storesService.updateStore(this.getUserId(), storeId, data);
  }

  @Delete(':storeId')
  async removeStore(@Param('storeId') storeId: string) {
    return this.storesService.removeStore(this.getUserId(), storeId);
  }

  @Post(':storeId/toggle')
  async toggleStatus(@Param('storeId') storeId: string) {
    return this.storesService.toggleStoreStatus(this.getUserId(), storeId);
  }

  @Get(':storeId/stats')
  async getStoreStats(@Param('storeId') storeId: string) {
    return this.storesService.getStoreStats(this.getUserId(), storeId);
  }

  @Post('test-connection')
  async testConnection(
    @Body() data: {
      platform: 'WOOCOMMERCE' | 'SHOPIFY';
      storeUrl: string;
      credentials: {
        woocommerce?: { consumerKey: string; consumerSecret: string };
        shopify?: { accessToken: string };
      };
    },
  ) {
    try {
      if (data.platform === 'WOOCOMMERCE') {
        if (!data.credentials.woocommerce) {
          return { success: false, error: 'WooCommerce credentials required' };
        }
        const result = await this.wooCommerce.testConnectionWithCredentials(
          data.storeUrl,
          data.credentials.woocommerce.consumerKey,
          data.credentials.woocommerce.consumerSecret,
        );
        return result;
      } else if (data.platform === 'SHOPIFY') {
        if (!data.credentials.shopify) {
          return { success: false, error: 'Shopify credentials required' };
        }
        const result = await this.shopify.testConnectionWithDetails(
          data.storeUrl,
          data.credentials.shopify.accessToken,
        );
        return result;
      }
      return { success: false, error: 'Invalid platform' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection test failed',
      };
    }
  }

  // ============ SYNC ENDPOINTS ============

  @Post(':storeId/sync')
  async syncStore(@Param('storeId') storeId: string) {
    return this.storesService.syncStore(this.getUserId(), storeId);
  }

  @Post(':storeId/sync/orders')
  async syncOrders(@Param('storeId') storeId: string) {
    return this.storesService.syncOrders(this.getUserId(), storeId);
  }

  @Post(':storeId/sync/products')
  async syncProducts(@Param('storeId') storeId: string) {
    return this.storesService.syncProducts(this.getUserId(), storeId);
  }

  // ============ WEBHOOK ENDPOINTS ============

  @Get(':storeId/webhooks')
  async getWebhookStatus(@Param('storeId') storeId: string) {
    const store = await this.storesService.getStoreById(storeId);
    if (!store) {
      return { success: false, error: 'Store not found' };
    }
    return this.webhookSetupService.verifyWebhooksActive(store);
  }

  @Post(':storeId/webhooks/repair')
  async repairWebhooks(@Param('storeId') storeId: string) {
    const store = await this.storesService.getStoreById(storeId);
    if (!store) {
      return { success: false, error: 'Store not found' };
    }
    return this.webhookSetupService.repairWebhooks(store);
  }
}
