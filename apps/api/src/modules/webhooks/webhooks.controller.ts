import {
  Controller,
  Post,
  Body,
  Headers,
  Param,
  UseGuards,
  RawBodyRequest,
  Req,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { WooCommerceSignatureGuard } from './guards/woocommerce-signature.guard';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * WooCommerce webhook endpoint
   * URL: POST /api/webhooks/woocommerce/:storeId
   *
   * Configure in WooCommerce: Settings → Advanced → Webhooks
   */
  @Post('woocommerce/:storeId')
  @UseGuards(WooCommerceSignatureGuard)
  @HttpCode(200)
  async handleWooCommerceWebhook(
    @Param('storeId') storeId: string,
    @Headers('x-wc-webhook-topic') topic: string,
    @Headers('x-wc-webhook-delivery-id') deliveryId: string,
    @Body() payload: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    this.logger.log(`Webhook received: ${topic} for store ${storeId}`);

    // Log the event first
    await this.webhooksService.logWebhookEvent({
      storeId,
      topic,
      deliveryId: deliveryId || `manual-${Date.now()}`,
      payload,
    });

    // Route to appropriate handler
    switch (topic) {
      case 'order.created':
        return this.webhooksService.handleOrderCreated(storeId, payload);
      case 'order.updated':
        return this.webhooksService.handleOrderUpdated(storeId, payload);
      case 'order.deleted':
        return this.webhooksService.handleOrderDeleted(storeId, payload);
      default:
        this.logger.warn(`Unhandled webhook topic: ${topic}`);
        return { received: true, processed: false, message: `Topic ${topic} not handled` };
    }
  }

  /**
   * Manual trigger endpoint for testing (no signature required)
   * URL: POST /api/webhooks/test/:storeId
   */
  @Post('test/:storeId')
  @HttpCode(200)
  async handleTestWebhook(
    @Param('storeId') storeId: string,
    @Body() body: { topic: string; payload: any },
  ) {
    this.logger.log(`Test webhook triggered: ${body.topic} for store ${storeId}`);

    const deliveryId = `test-${Date.now()}`;

    await this.webhooksService.logWebhookEvent({
      storeId,
      topic: body.topic,
      deliveryId,
      payload: body.payload,
    });

    switch (body.topic) {
      case 'order.created':
        return this.webhooksService.handleOrderCreated(storeId, body.payload);
      case 'order.updated':
        return this.webhooksService.handleOrderUpdated(storeId, body.payload);
      default:
        return { received: true, processed: false, topic: body.topic };
    }
  }

  /**
   * Webhook verification endpoint for WooCommerce setup
   */
  @Post('woocommerce/:storeId/verify')
  @HttpCode(200)
  async verifyWebhook(@Param('storeId') storeId: string) {
    return { success: true, storeId, message: 'Webhook endpoint verified' };
  }
}
