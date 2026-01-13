import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { EmailService } from '../../common/email';

export interface RefundRequest {
  orderId: string;
  reason: string;
  amount?: number;
  fullRefund?: boolean;
}

export interface RefundResult {
  success: boolean;
  orderId: string;
  refundAmount: number;
  status: string;
  error?: string;
}

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private prisma: PrismaService,
    private wooCommerce: WooCommerceService,
    private emailService: EmailService,
  ) {}

  /**
   * Process a refund request
   */
  async processRefund(request: RefundRequest): Promise<RefundResult> {
    try {
      // Get order from database
      const order = await this.prisma.order.findUnique({
        where: { id: request.orderId },
        include: { items: true },
      });

      if (!order) {
        return {
          success: false,
          orderId: request.orderId,
          refundAmount: 0,
          status: 'FAILED',
          error: 'Order not found',
        };
      }

      // Calculate refund amount
      const refundAmount = request.fullRefund || !request.amount
        ? order.total
        : Math.min(request.amount, order.total);

      // Extract WooCommerce order ID
      const wooOrderId = parseInt(order.id.replace('WOO-', ''), 10);

      if (wooOrderId) {
        // Update WooCommerce order status to refunded
        await this.wooCommerce.updateOrderStatus(wooOrderId, 'refunded');
      }

      // Update order in database
      await this.prisma.order.update({
        where: { id: request.orderId },
        data: {
          status: 'CANCELLED',
        },
      });

      // Send refund notification to customer
      if (order.customerEmail) {
        await this.emailService.sendRefundNotificationEmail(order.customerEmail, {
          orderNumber: order.id,
          customerName: 'Customer',
          refundAmount,
          reason: request.reason,
        });
      }

      this.logger.log(`Refund processed for order ${request.orderId}: $${refundAmount}`);

      return {
        success: true,
        orderId: request.orderId,
        refundAmount,
        status: 'REFUNDED',
      };
    } catch (error) {
      this.logger.error(`Refund failed for order ${request.orderId}`, error);
      return {
        success: false,
        orderId: request.orderId,
        refundAmount: 0,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel an order before fulfillment
   */
  async cancelOrder(orderId: string, reason: string): Promise<RefundResult> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return {
          success: false,
          orderId,
          refundAmount: 0,
          status: 'FAILED',
          error: 'Order not found',
        };
      }

      // Can only cancel PENDING orders
      if (order.status !== 'PENDING' && order.status !== 'PAID') {
        return {
          success: false,
          orderId,
          refundAmount: 0,
          status: 'FAILED',
          error: `Cannot cancel order in ${order.status} status`,
        };
      }

      // Update WooCommerce
      const wooOrderId = parseInt(orderId.replace('WOO-', ''), 10);
      if (wooOrderId) {
        await this.wooCommerce.updateOrderStatus(wooOrderId, 'cancelled');
      }

      // Update database
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      this.logger.log(`Order ${orderId} cancelled: ${reason}`);

      return {
        success: true,
        orderId,
        refundAmount: order.total,
        status: 'CANCELLED',
      };
    } catch (error) {
      return {
        success: false,
        orderId,
        refundAmount: 0,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get refund/return statistics
   */
  async getRefundStats(): Promise<{
    totalRefunds: number;
    totalAmount: number;
    thisMonth: number;
    thisMonthAmount: number;
  }> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [allRefunds, monthRefunds] = await Promise.all([
      this.prisma.order.findMany({
        where: { status: 'CANCELLED' },
      }),
      this.prisma.order.findMany({
        where: {
          status: 'CANCELLED',
          updatedAt: { gte: monthStart },
        },
      }),
    ]);

    return {
      totalRefunds: allRefunds.length,
      totalAmount: allRefunds.reduce((sum, o) => sum + o.total, 0),
      thisMonth: monthRefunds.length,
      thisMonthAmount: monthRefunds.reduce((sum, o) => sum + o.total, 0),
    };
  }

  /**
   * Get pending return requests
   */
  async getPendingReturns(): Promise<
    Array<{
      orderId: string;
      customerEmail: string;
      total: number;
      createdAt: Date;
    }>
  > {
    // For now, return orders that might need attention
    // In a full implementation, you'd have a separate returns table
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      select: {
        id: true,
        customerEmail: true,
        total: true,
        createdAt: true,
      },
    });

    return orders.map(o => ({
      orderId: o.id,
      customerEmail: o.customerEmail,
      total: o.total,
      createdAt: o.createdAt,
    }));
  }
}
