import { Injectable } from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';

@Injectable()
export class GetPendingOrdersTool {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * MCP Tool: get_pending_orders
   * Get all pending orders from WooCommerce that need fulfillment
   */
  async execute(): Promise<{
    success: boolean;
    data?: {
      count: number;
      orders: Array<{
        id: number;
        customer: string;
        total: string;
        items: string[];
        date: string;
      }>;
      totalValue: number;
    };
    error?: string;
  }> {
    try {
      const orders = await this.ordersService.getPendingOrders();

      const formattedOrders = orders.map(order => ({
        id: order.id,
        customer: `${order.billing.first_name} ${order.billing.last_name}`,
        total: order.total,
        items: order.line_items.map(item => `${item.name} (x${item.quantity})`),
        date: order.date_created,
      }));

      const totalValue = orders.reduce((sum, o) => sum + parseFloat(o.total), 0);

      return {
        success: true,
        data: {
          count: orders.length,
          orders: formattedOrders,
          totalValue,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get pending orders',
      };
    }
  }

  getToolDefinition() {
    return {
      name: 'get_pending_orders',
      description: 'Get all pending orders from WooCommerce store that are ready for fulfillment. Returns order count, customer details, items, and total value.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }
}
