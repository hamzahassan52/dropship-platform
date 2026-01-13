import { Injectable } from '@nestjs/common';
import { RefundsService } from '../../refunds/refunds.service';

@Injectable()
export class ProcessRefundTool {
  constructor(private readonly refundsService: RefundsService) {}

  getToolDefinition() {
    return {
      name: 'process_refund',
      description: 'Process a refund or cancel an order. Can handle full or partial refunds.',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: {
            type: 'string',
            description: 'The order ID to refund (e.g., WOO-123).',
          },
          action: {
            type: 'string',
            enum: ['refund', 'cancel'],
            description: 'Action to perform: "refund" for processed orders, "cancel" for pending orders.',
          },
          reason: {
            type: 'string',
            description: 'Reason for the refund or cancellation.',
          },
          amount: {
            type: 'number',
            description: 'Partial refund amount. If not provided, full refund will be processed.',
          },
        },
        required: ['orderId', 'action', 'reason'],
      },
    };
  }

  async execute(params: {
    orderId: string;
    action: 'refund' | 'cancel';
    reason: string;
    amount?: number;
  }) {
    if (params.action === 'cancel') {
      const result = await this.refundsService.cancelOrder(params.orderId, params.reason);
      return {
        success: result.success,
        message: result.success
          ? `Order ${params.orderId} cancelled successfully`
          : `Failed to cancel: ${result.error}`,
        result,
      };
    }

    const result = await this.refundsService.processRefund({
      orderId: params.orderId,
      reason: params.reason,
      amount: params.amount,
      fullRefund: !params.amount,
    });

    return {
      success: result.success,
      message: result.success
        ? `Refund of $${result.refundAmount.toFixed(2)} processed for order ${params.orderId}`
        : `Failed to process refund: ${result.error}`,
      result,
    };
  }
}
