import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { FulfillmentStatus, Order } from '@prisma/client';
import { EmailService } from '../../common/email/email.service';

export interface RetryResult {
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{ orderId: string; error: string }>;
}

@Injectable()
export class OrderRetryService {
  private readonly logger = new Logger(OrderRetryService.name);

  // Retry intervals: 15 minutes, 1 hour, 4 hours
  private readonly RETRY_DELAYS_MS = [
    15 * 60 * 1000,      // 15 min
    60 * 60 * 1000,      // 1 hour
    4 * 60 * 60 * 1000,  // 4 hours
  ];

  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Schedule a retry for a failed order
   */
  async scheduleRetry(order: Order, error: string): Promise<void> {
    const attempts = order.fulfillmentAttempts;

    if (attempts >= this.MAX_RETRY_ATTEMPTS) {
      // Max retries reached, mark as failed
      await this.markAsFailed(order.id, error);
      return;
    }

    const nextRetryAt = this.calculateNextRetryTime(attempts);
    const newStatus = this.getRetryStatus(attempts + 1);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: newStatus,
        fulfillmentAttempts: attempts + 1,
        lastFulfillmentError: error,
        nextRetryAt,
      },
    });

    // Create or update FailedOrder entry
    await this.prisma.failedOrder.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        attempts: attempts + 1,
        lastError: error,
        nextRetryAt,
      },
      update: {
        attempts: attempts + 1,
        lastError: error,
        nextRetryAt,
      },
    });

    this.logger.log(`Scheduled retry ${attempts + 1} for order ${order.id} at ${nextRetryAt.toISOString()}`);
  }

  /**
   * Mark order as permanently failed
   */
  async markAsFailed(orderId: string, error: string): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: FulfillmentStatus.FAILED,
        lastFulfillmentError: error,
        nextRetryAt: null,
      },
    });

    await this.prisma.failedOrder.upsert({
      where: { orderId },
      create: {
        orderId,
        attempts: this.MAX_RETRY_ATTEMPTS,
        lastError: error,
        nextRetryAt: null,
      },
      update: {
        lastError: error,
        nextRetryAt: null,
      },
    });

    // Get order details for notification
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, store: true },
    });

    if (order?.user?.email) {
      try {
        await this.emailService.sendErrorAlertEmail(
          order.user.email,
          'Order Fulfillment Failed',
          `Order ${order.externalOrderId || order.id} from store "${order.store.name}" has permanently failed after ${this.MAX_RETRY_ATTEMPTS} attempts. Error: ${error}`,
        );
      } catch (e) {
        this.logger.error(`Failed to send failure notification: ${e}`);
      }
    }

    this.logger.warn(`Order ${orderId} marked as permanently FAILED`);
  }

  /**
   * Get orders ready for retry
   */
  async getOrdersForRetry(): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: {
        fulfillmentStatus: {
          in: [FulfillmentStatus.RETRY_1, FulfillmentStatus.RETRY_2, FulfillmentStatus.RETRY_3],
        },
        nextRetryAt: {
          lte: new Date(),
        },
      },
      include: {
        store: true,
        items: true,
      },
      orderBy: { nextRetryAt: 'asc' },
      take: 50, // Process in batches
    });
  }

  /**
   * Get all failed orders for a user
   */
  async getFailedOrders(userId: string) {
    return this.prisma.failedOrder.findMany({
      where: {
        order: { userId },
      },
      include: {
        order: {
          include: {
            store: { select: { id: true, name: true, platform: true } },
            items: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get retry queue stats
   */
  async getRetryQueueStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [pending, retry1, retry2, retry3, failed] = await Promise.all([
      this.prisma.order.count({ where: { ...where, fulfillmentStatus: FulfillmentStatus.PENDING } }),
      this.prisma.order.count({ where: { ...where, fulfillmentStatus: FulfillmentStatus.RETRY_1 } }),
      this.prisma.order.count({ where: { ...where, fulfillmentStatus: FulfillmentStatus.RETRY_2 } }),
      this.prisma.order.count({ where: { ...where, fulfillmentStatus: FulfillmentStatus.RETRY_3 } }),
      this.prisma.order.count({ where: { ...where, fulfillmentStatus: FulfillmentStatus.FAILED } }),
    ]);

    return {
      pending,
      inRetry: retry1 + retry2 + retry3,
      retry1,
      retry2,
      retry3,
      failed,
    };
  }

  /**
   * Manual retry for a specific order
   */
  async resetForManualRetry(orderId: string): Promise<{ success: boolean; message: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    if (order.fulfillmentStatus === FulfillmentStatus.FULFILLED) {
      return { success: false, message: 'Order already fulfilled' };
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: FulfillmentStatus.PENDING,
        fulfillmentAttempts: 0,
        lastFulfillmentError: null,
        nextRetryAt: null,
      },
    });

    await this.prisma.failedOrder.deleteMany({
      where: { orderId },
    });

    this.logger.log(`Order ${orderId} reset for manual retry`);
    return { success: true, message: 'Order reset for retry' };
  }

  /**
   * Cancel retry for an order
   */
  async cancelRetry(orderId: string): Promise<{ success: boolean; message: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: FulfillmentStatus.CANCELLED,
        nextRetryAt: null,
      },
    });

    await this.prisma.failedOrder.deleteMany({
      where: { orderId },
    });

    this.logger.log(`Retry cancelled for order ${orderId}`);
    return { success: true, message: 'Retry cancelled' };
  }

  /**
   * Calculate next retry time based on attempts
   */
  private calculateNextRetryTime(attempts: number): Date {
    const delayIndex = Math.min(attempts, this.RETRY_DELAYS_MS.length - 1);
    const delayMs = this.RETRY_DELAYS_MS[delayIndex];
    return new Date(Date.now() + delayMs);
  }

  /**
   * Get fulfillment status based on retry attempt number
   */
  private getRetryStatus(attempt: number): FulfillmentStatus {
    switch (attempt) {
      case 1:
        return FulfillmentStatus.RETRY_1;
      case 2:
        return FulfillmentStatus.RETRY_2;
      case 3:
        return FulfillmentStatus.RETRY_3;
      default:
        return FulfillmentStatus.FAILED;
    }
  }
}
