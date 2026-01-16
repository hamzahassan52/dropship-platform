import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Store, StorePlatform } from '@prisma/client';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { ShopifyService } from '../../integrations/shopify/shopify.service';
import { PrismaService } from '../../common/prisma.service';
import * as crypto from 'crypto';

export interface WebhookSetupResult {
  success: boolean;
  created: string[];
  failed: string[];
  webhookSecret?: string;
}

@Injectable()
export class WebhookSetupService {
  private readonly logger = new Logger(WebhookSetupService.name);

  // WooCommerce webhook topics
  private readonly WOO_TOPICS = [
    'order.created',
    'order.updated',
    'product.updated',
    'product.deleted',
  ];

  // Shopify webhook topics
  private readonly SHOPIFY_TOPICS = [
    'orders/create',
    'orders/updated',
    'products/update',
    'products/delete',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly wooCommerceService: WooCommerceService,
    private readonly shopifyService: ShopifyService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Setup webhooks for a store after creation
   */
  async setupStoreWebhooks(store: Store): Promise<WebhookSetupResult> {
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:4000';

    const created: string[] = [];
    const failed: string[] = [];

    if (store.platform === StorePlatform.WOOCOMMERCE) {
      const credentials = store.credentials as { consumerKey: string; consumerSecret: string };

      for (const topic of this.WOO_TOPICS) {
        const deliveryUrl = `${backendUrl}/api/webhooks/woocommerce/${store.id}`;
        const result = await this.wooCommerceService.createWebhook(
          store.storeUrl,
          credentials.consumerKey,
          credentials.consumerSecret,
          topic,
          deliveryUrl,
          webhookSecret,
        );

        if (result) {
          created.push(topic);
          this.logger.log(`Created WooCommerce webhook: ${topic} for store ${store.id}`);
        } else {
          failed.push(topic);
          this.logger.warn(`Failed to create WooCommerce webhook: ${topic} for store ${store.id}`);
        }
      }
    } else if (store.platform === StorePlatform.SHOPIFY) {
      const credentials = store.credentials as { accessToken: string };

      for (const topic of this.SHOPIFY_TOPICS) {
        const address = `${backendUrl}/api/webhooks/shopify/${store.id}`;
        const result = await this.shopifyService.createWebhook(
          store.storeUrl,
          credentials.accessToken,
          topic,
          address,
        );

        if (result) {
          created.push(topic);
          this.logger.log(`Created Shopify webhook: ${topic} for store ${store.id}`);
        } else {
          failed.push(topic);
          this.logger.warn(`Failed to create Shopify webhook: ${topic} for store ${store.id}`);
        }
      }
    }

    // Update store with webhook secret
    if (created.length > 0) {
      await this.prisma.store.update({
        where: { id: store.id },
        data: { webhookSecret },
      });
    }

    return {
      success: failed.length === 0,
      created,
      failed,
      webhookSecret: created.length > 0 ? webhookSecret : undefined,
    };
  }

  /**
   * Remove webhooks when store is deleted
   */
  async removeStoreWebhooks(store: Store): Promise<void> {
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:4000';
    const urlPattern = backendUrl.includes('localhost') ? 'webhooks' : backendUrl;

    try {
      if (store.platform === StorePlatform.WOOCOMMERCE) {
        const credentials = store.credentials as { consumerKey: string; consumerSecret: string };
        const deleted = await this.wooCommerceService.deleteWebhooksByUrl(
          store.storeUrl,
          credentials.consumerKey,
          credentials.consumerSecret,
          urlPattern,
        );
        this.logger.log(`Deleted ${deleted} WooCommerce webhooks for store ${store.id}`);
      } else if (store.platform === StorePlatform.SHOPIFY) {
        const credentials = store.credentials as { accessToken: string };
        const deleted = await this.shopifyService.deleteWebhooksByUrl(
          store.storeUrl,
          credentials.accessToken,
          urlPattern,
        );
        this.logger.log(`Deleted ${deleted} Shopify webhooks for store ${store.id}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to remove webhooks for store ${store.id}: ${error?.message}`);
    }
  }

  /**
   * Verify webhooks are active for a store
   */
  async verifyWebhooksActive(store: Store): Promise<{ active: string[]; missing: string[] }> {
    const active: string[] = [];
    const missing: string[] = [];

    if (store.platform === StorePlatform.WOOCOMMERCE) {
      const credentials = store.credentials as { consumerKey: string; consumerSecret: string };
      const webhooks = await this.wooCommerceService.listWebhooks(
        store.storeUrl,
        credentials.consumerKey,
        credentials.consumerSecret,
      );

      const activeTopics = webhooks.filter(w => w.status === 'active').map(w => w.topic);

      for (const topic of this.WOO_TOPICS) {
        if (activeTopics.includes(topic)) {
          active.push(topic);
        } else {
          missing.push(topic);
        }
      }
    } else if (store.platform === StorePlatform.SHOPIFY) {
      const credentials = store.credentials as { accessToken: string };
      const webhooks = await this.shopifyService.listWebhooks(
        store.storeUrl,
        credentials.accessToken,
      );

      const activeTopics = webhooks.map(w => w.topic);

      for (const topic of this.SHOPIFY_TOPICS) {
        if (activeTopics.includes(topic)) {
          active.push(topic);
        } else {
          missing.push(topic);
        }
      }
    }

    return { active, missing };
  }

  /**
   * Repair missing webhooks for a store
   */
  async repairWebhooks(store: Store): Promise<WebhookSetupResult> {
    const { missing } = await this.verifyWebhooksActive(store);

    if (missing.length === 0) {
      return { success: true, created: [], failed: [] };
    }

    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:4000';
    const webhookSecret = store.webhookSecret || crypto.randomBytes(32).toString('hex');

    const created: string[] = [];
    const failed: string[] = [];

    if (store.platform === StorePlatform.WOOCOMMERCE) {
      const credentials = store.credentials as { consumerKey: string; consumerSecret: string };

      for (const topic of missing) {
        const deliveryUrl = `${backendUrl}/api/webhooks/woocommerce/${store.id}`;
        const result = await this.wooCommerceService.createWebhook(
          store.storeUrl,
          credentials.consumerKey,
          credentials.consumerSecret,
          topic,
          deliveryUrl,
          webhookSecret,
        );

        if (result) {
          created.push(topic);
        } else {
          failed.push(topic);
        }
      }
    } else if (store.platform === StorePlatform.SHOPIFY) {
      const credentials = store.credentials as { accessToken: string };

      for (const topic of missing) {
        const address = `${backendUrl}/api/webhooks/shopify/${store.id}`;
        const result = await this.shopifyService.createWebhook(
          store.storeUrl,
          credentials.accessToken,
          topic,
          address,
        );

        if (result) {
          created.push(topic);
        } else {
          failed.push(topic);
        }
      }
    }

    // Update webhook secret if not set
    if (!store.webhookSecret && created.length > 0) {
      await this.prisma.store.update({
        where: { id: store.id },
        data: { webhookSecret },
      });
    }

    return {
      success: failed.length === 0,
      created,
      failed,
      webhookSecret: created.length > 0 ? webhookSecret : undefined,
    };
  }
}
