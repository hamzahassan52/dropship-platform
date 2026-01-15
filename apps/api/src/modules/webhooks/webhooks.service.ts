import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { EmailService } from '../../common/email/email.service';

interface WebhookEventLog {
  storeId: string;
  topic: string;
  deliveryId: string;
  payload: any;
}

export interface WebhookProcessResult {
  received: boolean;
  processed: boolean;
  orderId?: string;
  cjOrderId?: string;
  simulated?: boolean;
  error?: string;
  message?: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  /**
   * Log webhook event to database for audit trail
   */
  async logWebhookEvent(event: WebhookEventLog): Promise<void> {
    try {
      await this.prisma.webhookLog.create({
        data: {
          storeId: event.storeId,
          topic: event.topic,
          deliveryId: event.deliveryId,
          payload: event.payload,
          processed: false,
        },
      });
      this.logger.log(`Logged webhook event: ${event.topic} - ${event.deliveryId}`);
    } catch (error) {
      // Handle duplicate deliveryId (webhook retry)
      if ((error as any).code === 'P2002') {
        this.logger.warn(`Duplicate webhook delivery: ${event.deliveryId}`);
      } else {
        this.logger.error('Failed to log webhook event:', error);
      }
    }
  }

  /**
   * Mark webhook as processed
   */
  async markWebhookProcessed(deliveryId: string, error?: string): Promise<void> {
    try {
      await this.prisma.webhookLog.update({
        where: { deliveryId },
        data: {
          processed: true,
          error: error || null,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to mark webhook ${deliveryId} as processed:`, err);
    }
  }

  /**
   * Handle order.created webhook - Main automation entry point
   */
  async handleOrderCreated(storeId: string, payload: any): Promise<WebhookProcessResult> {
    const orderId = payload.id;
    const status = payload.status;

    this.logger.log(`Processing new order ${orderId} with status ${status}`);

    // Only process 'processing' orders (paid orders ready for fulfillment)
    if (status !== 'processing') {
      this.logger.log(`Order ${orderId} status is ${status}, skipping auto-fulfill`);
      return {
        received: true,
        processed: false,
        message: `Order status ${status} not ready for fulfillment (needs 'processing')`,
      };
    }

    const simulationMode = this.configService.get('CJ_SIMULATION_MODE') === 'true';

    try {
      // Process order through the fulfillment pipeline
      const result = await this.ordersService.fulfillOrderFromWebhook(
        storeId,
        payload,
        { simulationMode },
      );

      // Send customer confirmation email if order was processed
      if (result.success) {
        await this.sendOrderConfirmationToCustomer(payload);

        // Mark webhook as processed
        await this.markWebhookProcessed(`manual-${Date.now()}`);
      }

      return {
        received: true,
        processed: result.success,
        orderId: String(orderId),
        cjOrderId: result.cjOrderId || undefined,
        simulated: result.simulated,
        error: result.error || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process order ${orderId}:`, error);

      return {
        received: true,
        processed: false,
        orderId: String(orderId),
        error: errorMessage,
      };
    }
  }

  /**
   * Handle order.updated webhook
   */
  async handleOrderUpdated(storeId: string, payload: any): Promise<WebhookProcessResult> {
    const orderId = payload.id;
    const status = payload.status;

    this.logger.log(`Order ${orderId} updated to status ${status}`);

    // Handle status changes
    if (status === 'cancelled' || status === 'refunded') {
      this.logger.log(`Order ${orderId} was ${status}`);
      // TODO: Implement CJ order cancellation if possible
      return {
        received: true,
        processed: true,
        orderId: String(orderId),
        message: `Order ${status} noted`
      };
    }

    // If order changed to 'processing' and wasn't already fulfilled, process it
    if (status === 'processing') {
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          storeId,
          externalOrderId: String(orderId),
        },
      });

      if (!existingOrder) {
        this.logger.log(`Order ${orderId} changed to processing, triggering fulfillment`);
        return this.handleOrderCreated(storeId, payload);
      }
    }

    return { received: true, processed: true, orderId: String(orderId) };
  }

  /**
   * Handle order.deleted webhook
   */
  async handleOrderDeleted(storeId: string, payload: any): Promise<WebhookProcessResult> {
    this.logger.log(`Order ${payload.id} deleted from store ${storeId}`);
    return {
      received: true,
      processed: true,
      orderId: String(payload.id),
      message: 'Order deletion noted'
    };
  }

  /**
   * Send order confirmation email to customer
   */
  private async sendOrderConfirmationToCustomer(orderPayload: any): Promise<void> {
    const customerEmail = orderPayload.billing?.email;
    if (!customerEmail) {
      this.logger.warn('No customer email found for order confirmation');
      return;
    }

    const customerName = `${orderPayload.billing?.first_name || ''} ${orderPayload.billing?.last_name || ''}`.trim();

    const items = (orderPayload.line_items || []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price) || 0,
    }));

    const shippingAddress = [
      orderPayload.shipping?.address_1,
      orderPayload.shipping?.address_2,
      orderPayload.shipping?.city,
      orderPayload.shipping?.state,
      orderPayload.shipping?.postcode,
      orderPayload.shipping?.country,
    ].filter(Boolean).join(', ');

    try {
      await this.emailService.sendOrderConfirmationEmail(customerEmail, {
        orderNumber: `#${orderPayload.id}`,
        customerName: customerName || 'Valued Customer',
        items,
        total: parseFloat(orderPayload.total) || 0,
        shippingAddress,
      });
      this.logger.log(`Order confirmation email sent to ${customerEmail}`);
    } catch (error) {
      this.logger.error('Failed to send order confirmation email:', error);
    }
  }

  /**
   * Get webhook logs for a store
   */
  async getWebhookLogs(storeId: string, limit = 50): Promise<any[]> {
    return this.prisma.webhookLog.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
