import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private wooCommerce: WooCommerceService,
    private cjDropshipping: CjDropshippingService,
  ) {}

  /**
   * Get overall dashboard stats
   */
  async getDashboardStats(): Promise<{
    revenue: { today: number; week: number; month: number };
    profit: { today: number; week: number; month: number };
    orders: { pending: number; processing: number; shipped: number; total: number };
    products: { active: number; lowStock: number };
    connections: { woocommerce: boolean; cj: boolean };
  }> {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get orders for different periods
    const [todayOrders, weekOrders, monthOrders] = await Promise.all([
      this.prisma.order.findMany({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.findMany({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.order.findMany({ where: { createdAt: { gte: monthStart } } }),
    ]);

    // Calculate revenue and profit
    const calcTotals = (orders: any[]) => ({
      revenue: orders.reduce((sum, o) => sum + o.total, 0),
      profit: orders.reduce((sum, o) => sum + o.profit, 0),
    });

    const todayTotals = calcTotals(todayOrders);
    const weekTotals = calcTotals(weekOrders);
    const monthTotals = calcTotals(monthOrders);

    // Order status counts
    const orderCounts = await this.prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    const statusMap: Record<string, number> = {};
    orderCounts.forEach(item => {
      statusMap[item.status] = item._count;
    });

    // Product counts
    const activeProducts = await this.prisma.product.count();

    // Check connections
    const wooConnected = this.wooCommerce.isConnected();

    return {
      revenue: {
        today: todayTotals.revenue,
        week: weekTotals.revenue,
        month: monthTotals.revenue,
      },
      profit: {
        today: todayTotals.profit,
        week: weekTotals.profit,
        month: monthTotals.profit,
      },
      orders: {
        pending: statusMap['PENDING'] || 0,
        processing: statusMap['PROCESSING'] || 0,
        shipped: statusMap['SHIPPED'] || 0,
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      },
      products: {
        active: activeProducts,
        lowStock: 0,
      },
      connections: {
        woocommerce: wooConnected,
        cj: true,
      },
    };
  }

  /**
   * Get recent orders
   */
  async getRecentOrders(limit: number = 10) {
    return this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  /**
   * Get sales chart data
   */
  async getSalesChart(days: number = 7): Promise<{
    labels: string[];
    revenue: number[];
    profit: number[];
    orders: number[];
  }> {
    const labels: string[] = [];
    const revenue: number[] = [];
    const profit: number[] = [];
    const orders: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayOrders = await this.prisma.order.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      revenue.push(dayOrders.reduce((sum, o) => sum + o.total, 0));
      profit.push(dayOrders.reduce((sum, o) => sum + o.profit, 0));
      orders.push(dayOrders.length);
    }

    return { labels, revenue, profit, orders };
  }

  /**
   * Get top selling products
   */
  async getTopProducts(limit: number = 5): Promise<
    Array<{
      title: string;
      quantity: number;
      revenue: number;
    }>
  > {
    const items = await this.prisma.orderItem.groupBy({
      by: ['productTitle'],
      _sum: {
        quantity: true,
        unitPrice: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    return items.map(item => ({
      title: item.productTitle,
      quantity: item._sum.quantity || 0,
      revenue: (item._sum.unitPrice || 0) * (item._sum.quantity || 1),
    }));
  }

  /**
   * Get alerts and notifications
   */
  async getAlerts(): Promise<
    Array<{
      type: 'warning' | 'error' | 'info';
      message: string;
      timestamp: Date;
    }>
  > {
    const alerts: Array<{ type: 'warning' | 'error' | 'info'; message: string; timestamp: Date }> = [];

    // Check pending orders
    const pendingCount = await this.prisma.order.count({
      where: { status: 'PENDING' },
    });

    if (pendingCount > 10) {
      alerts.push({
        type: 'warning',
        message: `${pendingCount} orders pending fulfillment`,
        timestamp: new Date(),
      });
    }

    // Check cancelled orders (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cancelledOrders = await this.prisma.order.count({
      where: {
        status: 'CANCELLED',
        createdAt: { gte: yesterday },
      },
    });

    if (cancelledOrders > 0) {
      alerts.push({
        type: 'error',
        message: `${cancelledOrders} orders cancelled in last 24 hours`,
        timestamp: new Date(),
      });
    }

    // Check WooCommerce connection
    if (!this.wooCommerce.isConnected()) {
      alerts.push({
        type: 'error',
        message: 'WooCommerce not connected',
        timestamp: new Date(),
      });
    }

    return alerts;
  }
}
