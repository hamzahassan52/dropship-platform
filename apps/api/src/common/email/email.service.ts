import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;
  private fromEmail: string = '';

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromEmail = this.configService.get<string>('SMTP_FROM') || user || '';

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.isConfigured = true;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      return true;
    } catch {
      return false;
    }
  }

  // Order fulfilled notification
  async sendOrderFulfilledEmail(
    to: string,
    orderNumber: string,
    cjOrderId: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Order ${orderNumber} Fulfilled`,
      html: `
        <h2>Order Fulfilled Successfully</h2>
        <p><strong>Order:</strong> ${orderNumber}</p>
        <p><strong>Supplier Order ID:</strong> ${cjOrderId}</p>
        <p>The order has been placed with CJ Dropshipping and is being processed.</p>
      `,
    });
  }

  // Tracking update notification
  async sendTrackingUpdateEmail(
    to: string,
    orderNumber: string,
    trackingNumber: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Tracking Update - Order ${orderNumber}`,
      html: `
        <h2>Shipment Tracking Available</h2>
        <p><strong>Order:</strong> ${orderNumber}</p>
        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
        <p><a href="https://t.17track.net/en#nums=${trackingNumber}">Track Shipment</a></p>
      `,
    });
  }

  // Daily report email
  async sendDailyReportEmail(
    to: string,
    report: {
      date: string;
      revenue: number;
      profit: number;
      orders: { new: number; fulfilled: number; shipped: number };
      alerts: string[];
    },
  ): Promise<boolean> {
    const alertsHtml = report.alerts.length
      ? `<h3>Alerts</h3><ul>${report.alerts.map(a => `<li>${a}</li>`).join('')}</ul>`
      : '';

    return this.sendEmail({
      to,
      subject: `Daily Report - ${report.date}`,
      html: `
        <h2>Daily Business Report</h2>
        <p><strong>Date:</strong> ${report.date}</p>
        <h3>Revenue</h3>
        <p>Total Revenue: $${report.revenue.toFixed(2)}</p>
        <p>Total Profit: $${report.profit.toFixed(2)}</p>
        <h3>Orders</h3>
        <p>New Orders: ${report.orders.new}</p>
        <p>Fulfilled: ${report.orders.fulfilled}</p>
        <p>Shipped: ${report.orders.shipped}</p>
        ${alertsHtml}
      `,
    });
  }

  // Fulfillment batch summary
  async sendFulfillmentSummaryEmail(
    to: string,
    result: { total: number; successful: number; failed: number },
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Fulfillment Summary - ${result.successful}/${result.total} Successful`,
      html: `
        <h2>Auto-Fulfillment Summary</h2>
        <p><strong>Total Orders:</strong> ${result.total}</p>
        <p><strong>Successful:</strong> ${result.successful}</p>
        <p><strong>Failed:</strong> ${result.failed}</p>
      `,
    });
  }

  // Error alert
  async sendErrorAlertEmail(
    to: string,
    errorType: string,
    message: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Alert: ${errorType}`,
      html: `
        <h2>System Alert</h2>
        <p><strong>Type:</strong> ${errorType}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      `,
    });
  }

  // ============ CUSTOMER EMAILS ============

  // Order confirmation to customer
  async sendOrderConfirmationEmail(
    to: string,
    orderData: {
      orderNumber: string;
      customerName: string;
      items: Array<{ name: string; quantity: number; price: number }>;
      total: number;
      shippingAddress: string;
    },
  ): Promise<boolean> {
    const itemsHtml = orderData.items
      .map(item => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>$${item.price.toFixed(2)}</td></tr>`)
      .join('');

    return this.sendEmail({
      to,
      subject: `Order Confirmation - ${orderData.orderNumber}`,
      html: `
        <h2>Thank you for your order!</h2>
        <p>Hi ${orderData.customerName},</p>
        <p>We have received your order and it is being processed.</p>
        <h3>Order Details</h3>
        <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
        <table border="1" cellpadding="10" style="border-collapse: collapse;">
          <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
          ${itemsHtml}
        </table>
        <p><strong>Total:</strong> $${orderData.total.toFixed(2)}</p>
        <h3>Shipping Address</h3>
        <p>${orderData.shippingAddress}</p>
        <p>We will notify you when your order ships.</p>
      `,
    });
  }

  // Shipping notification to customer
  async sendShippingNotificationEmail(
    to: string,
    data: {
      orderNumber: string;
      customerName: string;
      trackingNumber: string;
      carrier: string;
      estimatedDelivery?: string;
    },
  ): Promise<boolean> {
    const deliveryText = data.estimatedDelivery
      ? `<p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>`
      : '';

    return this.sendEmail({
      to,
      subject: `Your Order ${data.orderNumber} Has Shipped!`,
      html: `
        <h2>Your order is on the way!</h2>
        <p>Hi ${data.customerName},</p>
        <p>Great news! Your order has been shipped.</p>
        <h3>Tracking Information</h3>
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Carrier:</strong> ${data.carrier}</p>
        <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
        ${deliveryText}
        <p><a href="https://t.17track.net/en#nums=${data.trackingNumber}" style="background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Track Your Package</a></p>
      `,
    });
  }

  // Delivery confirmation to customer
  async sendDeliveryConfirmationEmail(
    to: string,
    data: {
      orderNumber: string;
      customerName: string;
    },
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Your Order ${data.orderNumber} Has Been Delivered!`,
      html: `
        <h2>Your order has been delivered!</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your order <strong>${data.orderNumber}</strong> has been delivered.</p>
        <p>We hope you enjoy your purchase!</p>
        <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
      `,
    });
  }

  // Refund notification to customer
  async sendRefundNotificationEmail(
    to: string,
    data: {
      orderNumber: string;
      customerName: string;
      refundAmount: number;
      reason?: string;
    },
  ): Promise<boolean> {
    const reasonText = data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : '';

    return this.sendEmail({
      to,
      subject: `Refund Processed - Order ${data.orderNumber}`,
      html: `
        <h2>Refund Confirmation</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your refund has been processed.</p>
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Refund Amount:</strong> $${data.refundAmount.toFixed(2)}</p>
        ${reasonText}
        <p>The refund will appear in your account within 5-10 business days.</p>
      `,
    });
  }

  isConnected(): boolean {
    return this.isConfigured;
  }
}
