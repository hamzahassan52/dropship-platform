import { Injectable } from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';
import { WooCommerceService } from '../../../integrations/woocommerce/woocommerce.service';

@Injectable()
export class GetBusinessStatsTool {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly wooCommerce: WooCommerceService,
  ) {}

  /**
   * MCP Tool: get_business_stats
   * Get complete business statistics and daily report
   */
  async execute(params?: {
    period?: 'today' | 'week' | 'month';
  }): Promise<{
    success: boolean;
    data?: {
      overview: {
        pendingOrders: number;
        processingOrders: number;
        completedOrders: number;
        totalOrders: number;
      };
      today: {
        revenue: number;
        profit: number;
        newOrders: number;
        fulfilledOrders: number;
        shippedOrders: number;
      };
      topProducts: Array<{
        name: string;
        quantity: number;
        revenue: number;
      }>;
      alerts: string[];
    };
    error?: string;
  }> {
    try {
      // Get order counts from WooCommerce
      const orderCounts = await this.wooCommerce.getOrderCounts();

      // Get daily report
      const dailyReport = await this.ordersService.getDailyReport();

      return {
        success: true,
        data: {
          overview: {
            pendingOrders: orderCounts['pending'] || 0,
            processingOrders: orderCounts['processing'] || 0,
            completedOrders: orderCounts['completed'] || 0,
            totalOrders: Object.values(orderCounts).reduce((a, b) => a + b, 0),
          },
          today: {
            revenue: dailyReport.revenue,
            profit: dailyReport.profit,
            newOrders: dailyReport.orders.new,
            fulfilledOrders: dailyReport.orders.fulfilled,
            shippedOrders: dailyReport.orders.shipped,
          },
          topProducts: dailyReport.topProducts,
          alerts: dailyReport.alerts,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get business stats',
      };
    }
  }

  getToolDefinition() {
    return {
      name: 'get_business_stats',
      description: 'Get comprehensive business statistics including order counts, revenue, profit, top products, and alerts. Perfect for morning check-ins and daily reports.',
      inputSchema: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'week', 'month'],
            description: 'Time period for stats (default: today)',
          },
        },
        required: [],
      },
    };
  }
}
