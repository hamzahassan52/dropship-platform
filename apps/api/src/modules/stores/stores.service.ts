import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { StorePlatform } from '@prisma/client';

export interface WooCommerceCredentials {
  consumerKey: string;
  consumerSecret: string;
}

export interface ShopifyCredentials {
  accessToken: string;
  apiVersion?: string;
}

export interface StoreCredentials {
  woocommerce?: WooCommerceCredentials;
  shopify?: ShopifyCredentials;
  webhookSecret?: string;
}

export interface CreateStoreDto {
  name: string;
  platform: StorePlatform;
  storeUrl: string;
  credentials: StoreCredentials;
  settings?: {
    autoFulfill?: boolean;
    autoSyncTracking?: boolean;
    autoSyncInventory?: boolean;
  };
}

export interface UpdateStoreDto {
  name?: string;
  storeUrl?: string;
  credentials?: StoreCredentials;
  isActive?: boolean;
  settings?: {
    autoFulfill?: boolean;
    autoSyncTracking?: boolean;
    autoSyncInventory?: boolean;
  };
}

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Add a new store
   */
  async addStore(userId: string, data: CreateStoreDto) {
    // Validate URL format
    const url = this.normalizeUrl(data.storeUrl);

    // Check if store already exists
    const existing = await this.prisma.store.findFirst({
      where: {
        userId,
        storeUrl: url,
      },
    });

    if (existing) {
      return {
        success: false,
        error: 'Store with this URL already exists',
      };
    }

    // Create store
    const store = await this.prisma.store.create({
      data: {
        userId,
        name: data.name,
        platform: data.platform,
        storeUrl: url,
        credentials: data.credentials as any,
        settings: data.settings || {
          autoFulfill: true,
          autoSyncTracking: true,
          autoSyncInventory: true,
        },
        isActive: true,
      },
    });

    this.logger.log(`Store added: ${store.name} (${store.platform})`);

    return {
      success: true,
      store: {
        id: store.id,
        name: store.name,
        platform: store.platform,
        storeUrl: store.storeUrl,
        isActive: store.isActive,
      },
    };
  }

  /**
   * Update store
   */
  async updateStore(userId: string, storeId: string, data: UpdateStoreDto) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, userId },
    });

    if (!store) {
      return { success: false, error: 'Store not found' };
    }

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        name: data.name ?? store.name,
        storeUrl: data.storeUrl ? this.normalizeUrl(data.storeUrl) : store.storeUrl,
        credentials: data.credentials ? (data.credentials as any) : store.credentials,
        isActive: data.isActive ?? store.isActive,
        settings: data.settings ? { ...(store.settings as any), ...data.settings } : store.settings,
      },
    });

    return {
      success: true,
      store: {
        id: updated.id,
        name: updated.name,
        platform: updated.platform,
        storeUrl: updated.storeUrl,
        isActive: updated.isActive,
      },
    };
  }

  /**
   * Remove store
   */
  async removeStore(userId: string, storeId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, userId },
    });

    if (!store) {
      return { success: false, error: 'Store not found' };
    }

    // Check for pending orders
    const pendingOrders = await this.prisma.order.count({
      where: {
        storeId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (pendingOrders > 0) {
      return {
        success: false,
        error: `Cannot remove store with ${pendingOrders} pending orders`,
      };
    }

    await this.prisma.store.delete({
      where: { id: storeId },
    });

    this.logger.log(`Store removed: ${store.name}`);

    return { success: true, message: `Store "${store.name}" removed` };
  }

  /**
   * Get all stores for user
   */
  async getStores(userId: string) {
    const stores = await this.prisma.store.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            orders: true,
            products: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return stores.map(store => ({
      id: store.id,
      name: store.name,
      platform: store.platform,
      storeUrl: store.storeUrl,
      isActive: store.isActive,
      settings: store.settings,
      lastSyncAt: store.lastSyncAt,
      orderCount: store._count.orders,
      productCount: store._count.products,
      createdAt: store.createdAt,
    }));
  }

  /**
   * Get single store
   */
  async getStore(userId: string, storeId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, userId },
      include: {
        _count: {
          select: {
            orders: true,
            products: true,
          },
        },
      },
    });

    if (!store) return null;

    return {
      id: store.id,
      name: store.name,
      platform: store.platform,
      storeUrl: store.storeUrl,
      isActive: store.isActive,
      settings: store.settings,
      lastSyncAt: store.lastSyncAt,
      orderCount: store._count.orders,
      productCount: store._count.products,
      createdAt: store.createdAt,
    };
  }

  /**
   * Get store credentials (for internal use)
   */
  async getStoreCredentials(storeId: string): Promise<{
    platform: StorePlatform;
    storeUrl: string;
    credentials: StoreCredentials;
    webhookSecret: string | null;
  } | null> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        platform: true,
        storeUrl: true,
        credentials: true,
        webhookSecret: true,
      },
    });

    if (!store) return null;

    return {
      platform: store.platform,
      storeUrl: store.storeUrl,
      credentials: store.credentials as StoreCredentials,
      webhookSecret: store.webhookSecret,
    };
  }

  /**
   * Update webhook secret for a store
   */
  async updateWebhookSecret(storeId: string, webhookSecret: string): Promise<boolean> {
    try {
      await this.prisma.store.update({
        where: { id: storeId },
        data: { webhookSecret },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get store by ID (for internal use, no userId check)
   */
  async getStoreById(storeId: string) {
    return this.prisma.store.findUnique({
      where: { id: storeId },
    });
  }

  /**
   * Toggle store active status
   */
  async toggleStoreStatus(userId: string, storeId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, userId },
    });

    if (!store) {
      return { success: false, error: 'Store not found' };
    }

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: { isActive: !store.isActive },
    });

    return {
      success: true,
      isActive: updated.isActive,
      message: `Store "${store.name}" ${updated.isActive ? 'activated' : 'deactivated'}`,
    };
  }

  /**
   * Get store stats
   */
  async getStoreStats(userId: string, storeId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, userId },
    });

    if (!store) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, todayOrders, pendingOrders, allOrders] = await Promise.all([
      this.prisma.order.count({ where: { storeId } }),
      this.prisma.order.count({ where: { storeId, createdAt: { gte: today } } }),
      this.prisma.order.count({ where: { storeId, status: 'PENDING' } }),
      this.prisma.order.findMany({
        where: { storeId },
        select: { total: true, profit: true },
      }),
    ]);

    const totalRevenue = allOrders.reduce((sum, o) => sum + o.total, 0);
    const totalProfit = allOrders.reduce((sum, o) => sum + o.profit, 0);

    return {
      store: {
        id: store.id,
        name: store.name,
        platform: store.platform,
      },
      orders: {
        total: totalOrders,
        today: todayOrders,
        pending: pendingOrders,
      },
      revenue: totalRevenue,
      profit: totalProfit,
    };
  }

  /**
   * Get all active stores
   */
  async getActiveStores(userId: string) {
    return this.prisma.store.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        platform: true,
        storeUrl: true,
        credentials: true,
        settings: true,
      },
    });
  }

  /**
   * Update last sync time
   */
  async updateLastSync(storeId: string) {
    await this.prisma.store.update({
      where: { id: storeId },
      data: { lastSyncAt: new Date() },
    });
  }

  private normalizeUrl(url: string): string {
    let normalized = url.trim().toLowerCase();
    if (!normalized.startsWith('http')) {
      normalized = 'https://' + normalized;
    }
    // Remove trailing slash
    return normalized.replace(/\/$/, '');
  }
}
