import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class AnalyticsReportTool {
  constructor(private readonly prisma: PrismaService) {}

  getToolDefinition() {
    return {
      name: 'analytics_report',
      description: 'Get detailed analytics and reports. Includes sales trends, top products, customer insights, and profit analysis.',
      inputSchema: {
        type: 'object',
        properties: {
          reportType: {
            type: 'string',
            enum: ['sales', 'products', 'customers', 'profit', 'overview', 'trends'],
            description: 'Type of report to generate.',
          },
          period: {
            type: 'string',
            enum: ['today', 'yesterday', 'week', 'month', 'quarter', 'year', 'all'],
            description: 'Time period for the report. Default: month',
          },
          storeId: {
            type: 'string',
            description: 'Filter by specific store.',
          },
          limit: {
            type: 'number',
            description: 'Limit results for top lists. Default: 10',
          },
        },
        required: ['reportType'],
      },
    };
  }

  async execute(params: {
    reportType: 'sales' | 'products' | 'customers' | 'profit' | 'overview' | 'trends';
    period?: string;
    storeId?: string;
    limit?: number;
  }) {
    try {
      const limit = params.limit || 10;
      const dateFilter = this.getDateFilter(params.period || 'month');

      const baseWhere: any = {
        createdAt: { gte: dateFilter },
      };
      if (params.storeId) {
        baseWhere.storeId = params.storeId;
      }

      switch (params.reportType) {
        case 'overview':
          return this.getOverviewReport(baseWhere);

        case 'sales':
          return this.getSalesReport(baseWhere);

        case 'products':
          return this.getProductsReport(baseWhere, limit);

        case 'customers':
          return this.getCustomersReport(baseWhere, limit);

        case 'profit':
          return this.getProfitReport(baseWhere);

        case 'trends':
          return this.getTrendsReport(baseWhere);

        default:
          return { success: false, error: 'Invalid report type' };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate report',
      };
    }
  }

  private getDateFilter(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        return yesterday;
      case 'week':
        const week = new Date(now);
        week.setDate(week.getDate() - 7);
        return week;
      case 'month':
        const month = new Date(now);
        month.setMonth(month.getMonth() - 1);
        return month;
      case 'quarter':
        const quarter = new Date(now);
        quarter.setMonth(quarter.getMonth() - 3);
        return quarter;
      case 'year':
        const year = new Date(now);
        year.setFullYear(year.getFullYear() - 1);
        return year;
      case 'all':
        return new Date(0);
      default:
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }

  private async getOverviewReport(where: any) {
    const [orders, revenue, profit, stores] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({ where, _sum: { total: true } }),
      this.prisma.order.aggregate({ where, _sum: { profit: true } }),
      this.prisma.store.count({ where: { isActive: true } }),
    ]);

    const byStatus = await this.prisma.order.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    return {
      success: true,
      reportType: 'overview',
      data: {
        totalOrders: orders,
        totalRevenue: revenue._sum.total || 0,
        totalProfit: profit._sum.profit || 0,
        profitMargin: revenue._sum.total ? ((profit._sum.profit || 0) / revenue._sum.total * 100).toFixed(2) + '%' : '0%',
        activeStores: stores,
        ordersByStatus: byStatus.reduce((acc, s) => {
          acc[s.status] = s._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  private async getSalesReport(where: any) {
    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Group by date
    const salesByDate: Record<string, { orders: number; revenue: number; profit: number }> = {};
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!salesByDate[date]) {
        salesByDate[date] = { orders: 0, revenue: 0, profit: 0 };
      }
      salesByDate[date].orders++;
      salesByDate[date].revenue += order.total;
      salesByDate[date].profit += order.profit;
    });

    return {
      success: true,
      reportType: 'sales',
      data: {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
        totalProfit: orders.reduce((sum, o) => sum + o.profit, 0),
        averageOrderValue: orders.length ? (orders.reduce((sum, o) => sum + o.total, 0) / orders.length).toFixed(2) : 0,
        dailySales: Object.entries(salesByDate).map(([date, data]) => ({
          date,
          ...data,
        })).sort((a, b) => a.date.localeCompare(b.date)),
      },
    };
  }

  private async getProductsReport(where: any, limit: number) {
    const items = await this.prisma.orderItem.findMany({
      where: { order: where },
      select: {
        productTitle: true,
        quantity: true,
        unitPrice: true,
        supplierPrice: true,
      },
    });

    // Aggregate by product
    const productStats: Record<string, { sold: number; revenue: number; profit: number }> = {};
    items.forEach(item => {
      const name = item.productTitle;
      if (!productStats[name]) {
        productStats[name] = { sold: 0, revenue: 0, profit: 0 };
      }
      productStats[name].sold += item.quantity;
      productStats[name].revenue += item.unitPrice * item.quantity;
      productStats[name].profit += (item.unitPrice - item.supplierPrice) * item.quantity;
    });

    const topProducts = Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return {
      success: true,
      reportType: 'products',
      data: {
        totalProducts: Object.keys(productStats).length,
        topByRevenue: topProducts,
        topByQuantity: [...topProducts].sort((a, b) => b.sold - a.sold).slice(0, limit),
        topByProfit: [...topProducts].sort((a, b) => b.profit - a.profit).slice(0, limit),
      },
    };
  }

  private async getCustomersReport(where: any, limit: number) {
    const customerStats = await this.prisma.order.groupBy({
      by: ['customerEmail'],
      where,
      _count: { id: true },
      _sum: { total: true, profit: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const uniqueCustomers = await this.prisma.order.groupBy({
      by: ['customerEmail'],
      where,
    });

    return {
      success: true,
      reportType: 'customers',
      data: {
        totalCustomers: uniqueCustomers.length,
        topCustomers: customerStats.map((c, i) => ({
          rank: i + 1,
          email: c.customerEmail,
          orders: c._count.id,
          totalSpent: c._sum.total || 0,
          profitGenerated: c._sum.profit || 0,
        })),
        averageOrdersPerCustomer: uniqueCustomers.length ?
          (await this.prisma.order.count({ where }) / uniqueCustomers.length).toFixed(2) : 0,
      },
    };
  }

  private async getProfitReport(where: any) {
    const orders = await this.prisma.order.findMany({
      where,
      include: { items: true },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalCost = orders.reduce((sum, o) =>
      sum + o.items.reduce((itemSum, i) => itemSum + (i.supplierPrice * i.quantity), 0), 0);
    const totalProfit = totalRevenue - totalCost;

    // Profit by store
    const profitByStore = await this.prisma.order.groupBy({
      by: ['storeId'],
      where,
      _sum: { total: true, profit: true },
    });

    return {
      success: true,
      reportType: 'profit',
      data: {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin: totalRevenue ? ((totalProfit / totalRevenue) * 100).toFixed(2) + '%' : '0%',
        averageProfit: orders.length ? (totalProfit / orders.length).toFixed(2) : 0,
        profitByStore: profitByStore.map(s => ({
          storeId: s.storeId,
          revenue: s._sum.total || 0,
          profit: s._sum.profit || 0,
        })),
      },
    };
  }

  private async getTrendsReport(where: any) {
    // Get last 30 days data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await this.prisma.order.findMany({
      where: { ...where, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate week over week growth
    const thisWeek = orders.filter(o => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return o.createdAt >= weekAgo;
    });

    const lastWeek = orders.filter(o => {
      const weekAgo = new Date();
      const twoWeeksAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      return o.createdAt >= twoWeeksAgo && o.createdAt < weekAgo;
    });

    const thisWeekRevenue = thisWeek.reduce((sum, o) => sum + o.total, 0);
    const lastWeekRevenue = lastWeek.reduce((sum, o) => sum + o.total, 0);
    const growthRate = lastWeekRevenue ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue * 100).toFixed(2) : 'N/A';

    return {
      success: true,
      reportType: 'trends',
      data: {
        period: 'Last 30 days',
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
        weekOverWeek: {
          thisWeek: { orders: thisWeek.length, revenue: thisWeekRevenue },
          lastWeek: { orders: lastWeek.length, revenue: lastWeekRevenue },
          growthRate: growthRate + '%',
        },
        trend: thisWeekRevenue > lastWeekRevenue ? 'UP' : thisWeekRevenue < lastWeekRevenue ? 'DOWN' : 'STABLE',
      },
    };
  }
}
