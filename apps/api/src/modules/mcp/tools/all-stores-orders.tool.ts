import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class AllStoresOrdersTool {
  private readonly userId = 'default-user';

  constructor(private readonly prisma: PrismaService) {}

  getToolDefinition() {
    return {
      name: 'get_all_stores_orders',
      description: 'Get orders from all connected stores. Can filter by status or get combined stats.',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'ALL'],
            description: 'Filter orders by status. Default: ALL',
          },
          storeId: {
            type: 'string',
            description: 'Optional: Filter by specific store ID.',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of orders to return. Default: 50',
          },
          stats: {
            type: 'boolean',
            description: 'If true, return stats summary instead of order list.',
          },
        },
      },
    };
  }

  async execute(params: {
    status?: string;
    storeId?: string;
    limit?: number;
    stats?: boolean;
  }) {
    if (params.stats) {
      return this.getStats(params.storeId);
    }

    return this.getOrders(params);
  }

  private async getOrders(params: {
    status?: string;
    storeId?: string;
    limit?: number;
  }) {
    const where: any = { userId: this.userId };

    if (params.storeId) {
      where.storeId = params.storeId;
    }

    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        store: {
          select: { name: true, platform: true },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
    });

    return {
      success: true,
      count: orders.length,
      orders: orders.map(o => ({
        id: o.id,
        externalId: o.externalOrderId,
        store: o.store.name,
        platform: o.store.platform,
        customer: o.customerName || o.customerEmail,
        status: o.status,
        total: o.total,
        profit: o.profit,
        items: o.items.length,
        tracking: o.trackingNumber,
        createdAt: o.createdAt,
      })),
    };
  }

  private async getStats(storeId?: string) {
    const where: any = { userId: this.userId };
    if (storeId) {
      where.storeId = storeId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      todayOrders,
      allOrders,
      stores,
    ] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.order.count({ where: { ...where, status: 'PROCESSING' } }),
      this.prisma.order.count({ where: { ...where, status: 'SHIPPED' } }),
      this.prisma.order.count({ where: { ...where, createdAt: { gte: today } } }),
      this.prisma.order.findMany({ where, select: { total: true, profit: true } }),
      this.prisma.store.findMany({
        where: { userId: this.userId },
        select: { id: true, name: true, platform: true },
      }),
    ]);

    const totalRevenue = allOrders.reduce((sum, o) => sum + o.total, 0);
    const totalProfit = allOrders.reduce((sum, o) => sum + o.profit, 0);

    // Per store stats
    const storeStats = await Promise.all(
      stores.map(async store => {
        const storeOrders = await this.prisma.order.findMany({
          where: { storeId: store.id },
          select: { total: true, profit: true },
        });
        return {
          id: store.id,
          name: store.name,
          platform: store.platform,
          orders: storeOrders.length,
          revenue: storeOrders.reduce((sum, o) => sum + o.total, 0),
          profit: storeOrders.reduce((sum, o) => sum + o.profit, 0),
        };
      }),
    );

    return {
      success: true,
      summary: {
        totalStores: stores.length,
        totalOrders,
        todayOrders,
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
      },
      byStore: storeStats,
    };
  }
}
