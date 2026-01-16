import { Injectable } from '@nestjs/common';
import { EmailService } from '../../../common/email/email.service';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class SendNotificationTool {
  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  getToolDefinition() {
    return {
      name: 'send_notification',
      description: 'Send email notification to customer. Can send custom message or predefined templates.',
      inputSchema: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Customer email address.',
          },
          orderId: {
            type: 'string',
            description: 'Order ID to send notification about (alternative to email).',
          },
          type: {
            type: 'string',
            enum: ['custom', 'order_confirmation', 'shipping_update', 'delivery_confirmation', 'refund'],
            description: 'Type of notification. Default: custom',
          },
          subject: {
            type: 'string',
            description: 'Email subject (required for custom type).',
          },
          message: {
            type: 'string',
            description: 'Email message body (required for custom type).',
          },
          trackingNumber: {
            type: 'string',
            description: 'Tracking number (for shipping_update type).',
          },
        },
        required: ['type'],
      },
    };
  }

  async execute(params: {
    to?: string;
    orderId?: string;
    type: 'custom' | 'order_confirmation' | 'shipping_update' | 'delivery_confirmation' | 'refund';
    subject?: string;
    message?: string;
    trackingNumber?: string;
  }) {
    try {
      let email = params.to;
      let customerName = 'Valued Customer';
      let orderNumber = params.orderId || '';

      // If orderId provided, get customer email from order
      if (params.orderId && !email) {
        const order = await this.prisma.order.findUnique({
          where: { id: params.orderId },
        });
        if (order) {
          email = order.customerEmail;
          customerName = order.customerName || customerName;
          orderNumber = order.externalOrderId || order.id;
        }
      }

      if (!email) {
        return {
          success: false,
          error: 'Email address required. Provide "to" or valid "orderId".',
        };
      }

      let sent = false;

      switch (params.type) {
        case 'custom':
          if (!params.subject || !params.message) {
            return {
              success: false,
              error: 'Subject and message required for custom notification.',
            };
          }
          sent = await this.emailService.sendEmail({
            to: email,
            subject: params.subject,
            html: `<p>${params.message.replace(/\n/g, '<br>')}</p>`,
          });
          break;

        case 'order_confirmation':
          sent = await this.emailService.sendEmail({
            to: email,
            subject: `Order Confirmation - ${orderNumber}`,
            html: `
              <h2>Thank you for your order!</h2>
              <p>Hi ${customerName},</p>
              <p>We have received your order <strong>#${orderNumber}</strong> and it is being processed.</p>
              <p>We will notify you when your order ships.</p>
            `,
          });
          break;

        case 'shipping_update':
          const tracking = params.trackingNumber || 'Not available';
          sent = await this.emailService.sendShippingNotificationEmail(email, {
            orderNumber,
            customerName,
            trackingNumber: tracking,
            carrier: 'Shipping Carrier',
          });
          break;

        case 'delivery_confirmation':
          sent = await this.emailService.sendDeliveryConfirmationEmail(email, {
            orderNumber,
            customerName,
          });
          break;

        case 'refund':
          sent = await this.emailService.sendEmail({
            to: email,
            subject: `Refund Processed - Order ${orderNumber}`,
            html: `
              <h2>Refund Confirmation</h2>
              <p>Hi ${customerName},</p>
              <p>Your refund for order <strong>#${orderNumber}</strong> has been processed.</p>
              <p>The amount will appear in your account within 5-10 business days.</p>
            `,
          });
          break;
      }

      return {
        success: sent,
        message: sent ? `Notification sent to ${email}` : 'Failed to send email. Check SMTP configuration.',
        type: params.type,
        recipient: email,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send notification',
      };
    }
  }
}
