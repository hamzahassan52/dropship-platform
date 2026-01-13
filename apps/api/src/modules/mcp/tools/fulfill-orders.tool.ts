import { Injectable } from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';

@Injectable()
export class FulfillOrdersTool {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * MCP Tool: fulfill_orders
   * Auto-fulfill orders: WooCommerce → CJ Dropshipping
   */
  async execute(params: {
    orderId?: number;
    all?: boolean;
  }): Promise<{
    success: boolean;
    data?: {
      fulfilled: number;
      failed: number;
      results: Array<{
        orderId: number;
        status: string;
        cjOrderId?: string;
        error?: string;
      }>;
    };
    error?: string;
  }> {
    try {
      if (params.orderId) {
        // Fulfill single order
        const result = await this.ordersService.fulfillOrder(params.orderId);
        return {
          success: result.success,
          data: {
            fulfilled: result.success ? 1 : 0,
            failed: result.success ? 0 : 1,
            results: [{
              orderId: result.orderId,
              status: result.success ? 'fulfilled' : 'failed',
              cjOrderId: result.cjOrderId,
              error: result.error,
            }],
          },
        };
      }

      if (params.all) {
        // Fulfill all pending orders
        const result = await this.ordersService.fulfillAllPendingOrders();
        return {
          success: true,
          data: {
            fulfilled: result.successful,
            failed: result.failed,
            results: result.results.map(r => ({
              orderId: r.orderId,
              status: r.success ? 'fulfilled' : 'failed',
              cjOrderId: r.cjOrderId,
              error: r.error,
            })),
          },
        };
      }

      return {
        success: false,
        error: 'Please specify orderId or set all=true to fulfill all pending orders',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fulfill orders',
      };
    }
  }

  getToolDefinition() {
    return {
      name: 'fulfill_orders',
      description: 'Auto-fulfill orders by placing them on CJ Dropshipping. Can fulfill a single order by ID or all pending orders at once.',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: {
            type: 'number',
            description: 'Specific order ID to fulfill (optional)',
          },
          all: {
            type: 'boolean',
            description: 'Set to true to fulfill ALL pending orders',
          },
        },
        required: [],
      },
    };
  }
}
