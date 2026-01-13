import { Injectable } from '@nestjs/common';
import { OrdersService } from '../../orders/orders.service';

@Injectable()
export class SyncTrackingTool {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * MCP Tool: sync_tracking
   * Sync tracking numbers from CJ to WooCommerce and notify customers
   */
  async execute(): Promise<{
    success: boolean;
    data?: {
      updated: number;
      orders: Array<{
        orderId: number;
        trackingNumber: string;
      }>;
    };
    error?: string;
  }> {
    try {
      const result = await this.ordersService.syncTrackingNumbers();

      return {
        success: true,
        data: {
          updated: result.updated,
          orders: result.orders,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync tracking',
      };
    }
  }

  getToolDefinition() {
    return {
      name: 'sync_tracking',
      description: 'Sync tracking numbers from CJ Dropshipping to WooCommerce. Automatically updates order status and sends tracking info to customers.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }
}
