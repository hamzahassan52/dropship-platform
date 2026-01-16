import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Import beautiful email templates
import {
  orderReceivedTemplate,
  OrderReceivedData,
  orderProcessingTemplate,
  OrderProcessingData,
  orderShippedTemplate,
  OrderShippedData,
  orderDeliveredTemplate,
  OrderDeliveredData,
  welcomeTemplate,
  WelcomeEmailData,
} from '../../modules/email/templates';

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
  private fromName: string = 'DropShip Store';

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
      console.log('[EmailService] SMTP configured successfully');
    } else {
      console.log('[EmailService] SMTP not configured - missing credentials');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.log('[EmailService] Cannot send email - not configured');
      return false;
    }

    try {
      const result = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log(`[EmailService] Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      return false;
    }
  }

  // ============ BEAUTIFUL CUSTOMER EMAILS ============

  /**
   * Send Order Received/Confirmation Email (Beautiful Template)
   */
  async sendOrderReceivedEmail(to: string, data: OrderReceivedData): Promise<boolean> {
    const html = orderReceivedTemplate(data);
    return this.sendEmail({
      to,
      subject: `Order Confirmed! Your order #${data.orderNumber} has been received`,
      html,
    });
  }

  /**
   * Send Order Processing Email (Beautiful Template)
   */
  async sendOrderProcessingEmail(to: string, data: OrderProcessingData): Promise<boolean> {
    const html = orderProcessingTemplate(data);
    return this.sendEmail({
      to,
      subject: `We're working on your order #${data.orderNumber}`,
      html,
    });
  }

  /**
   * Send Order Shipped Email with Tracking (Beautiful Template)
   */
  async sendOrderShippedEmail(to: string, data: OrderShippedData): Promise<boolean> {
    const html = orderShippedTemplate(data);
    return this.sendEmail({
      to,
      subject: `Your order #${data.orderNumber} is on its way! Track: ${data.trackingNumber}`,
      html,
    });
  }

  /**
   * Send Order Delivered Email with Review Request (Beautiful Template)
   */
  async sendOrderDeliveredEmail(to: string, data: OrderDeliveredData): Promise<boolean> {
    const html = orderDeliveredTemplate(data);
    return this.sendEmail({
      to,
      subject: `Your order #${data.orderNumber} has been delivered! How was it?`,
      html,
    });
  }

  /**
   * Send Welcome Email to New Users (Beautiful Template)
   */
  async sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<boolean> {
    const html = welcomeTemplate(data);
    const discountText = data.discountCode ? ` Use code ${data.discountCode} for ${data.discountPercent}% off!` : '';
    return this.sendEmail({
      to,
      subject: `Welcome to DropShip Store, ${data.customerName}!${discountText}`,
      html,
    });
  }

  // ============ ADMIN/SYSTEM EMAILS (Simple Format) ============

  /**
   * Order fulfilled notification (Admin)
   */
  async sendOrderFulfilledEmail(
    to: string,
    orderNumber: string,
    cjOrderId: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Order ${orderNumber} Fulfilled - CJ ID: ${cjOrderId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Order Fulfilled Successfully</h2>
          <p><strong>Order:</strong> ${orderNumber}</p>
          <p><strong>Supplier Order ID:</strong> ${cjOrderId}</p>
          <p>The order has been placed with CJ Dropshipping and is being processed.</p>
        </div>
      `,
    });
  }

  /**
   * Tracking update notification (Admin)
   */
  async sendTrackingUpdateEmail(
    to: string,
    orderNumber: string,
    trackingNumber: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Tracking Update - Order ${orderNumber}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Shipment Tracking Available</h2>
          <p><strong>Order:</strong> ${orderNumber}</p>
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
          <p><a href="https://t.17track.net/en#nums=${trackingNumber}" style="color: #3b82f6;">Track Shipment</a></p>
        </div>
      `,
    });
  }

  /**
   * Daily report email (Admin)
   */
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
      ? `<h3 style="color: #f59e0b;">Alerts</h3><ul>${report.alerts.map(a => `<li>${a}</li>`).join('')}</ul>`
      : '';

    return this.sendEmail({
      to,
      subject: `Daily Business Report - ${report.date}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Daily Business Report</h2>
          <p><strong>Date:</strong> ${report.date}</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin-top: 0;">Revenue</h3>
            <p>Total Revenue: <strong style="color: #10b981;">$${report.revenue.toFixed(2)}</strong></p>
            <p>Total Profit: <strong style="color: #10b981;">$${report.profit.toFixed(2)}</strong></p>
          </div>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin-top: 0;">Orders</h3>
            <p>New Orders: <strong>${report.orders.new}</strong></p>
            <p>Fulfilled: <strong>${report.orders.fulfilled}</strong></p>
            <p>Shipped: <strong>${report.orders.shipped}</strong></p>
          </div>
          ${alertsHtml}
        </div>
      `,
    });
  }

  /**
   * Fulfillment batch summary (Admin)
   */
  async sendFulfillmentSummaryEmail(
    to: string,
    result: { total: number; successful: number; failed: number },
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Fulfillment Summary - ${result.successful}/${result.total} Successful`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Auto-Fulfillment Summary</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            <p>Total Orders: <strong>${result.total}</strong></p>
            <p>Successful: <strong style="color: #10b981;">${result.successful}</strong></p>
            <p>Failed: <strong style="color: #ef4444;">${result.failed}</strong></p>
          </div>
        </div>
      `,
    });
  }

  /**
   * Error alert (Admin)
   */
  async sendErrorAlertEmail(
    to: string,
    errorType: string,
    message: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Alert: ${errorType}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">System Alert</h2>
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
            <p><strong>Type:</strong> ${errorType}</p>
            <p><strong>Message:</strong> ${message}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          </div>
        </div>
      `,
    });
  }

  // ============ LEGACY CUSTOMER EMAILS (Kept for backward compatibility) ============

  /**
   * @deprecated Use sendOrderReceivedEmail instead for beautiful templates
   */
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
    // Convert to new format and use beautiful template
    return this.sendOrderReceivedEmail(to, {
      customerName: orderData.customerName,
      orderNumber: orderData.orderNumber,
      orderDate: new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }),
      items: orderData.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: orderData.total,
      shipping: 0,
      total: orderData.total,
      shippingAddress: {
        name: orderData.customerName,
        address1: orderData.shippingAddress,
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
    });
  }

  /**
   * @deprecated Use sendOrderShippedEmail instead for beautiful templates
   */
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
    // Use beautiful template
    return this.sendOrderShippedEmail(to, {
      customerName: data.customerName,
      orderNumber: data.orderNumber,
      trackingNumber: data.trackingNumber,
      carrier: data.carrier,
      trackingUrl: `https://t.17track.net/en#nums=${data.trackingNumber}`,
      estimatedDelivery: data.estimatedDelivery,
      items: [],
      shippingAddress: {
        name: data.customerName,
        address1: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
    });
  }

  /**
   * @deprecated Use sendOrderDeliveredEmail instead for beautiful templates
   */
  async sendDeliveryConfirmationEmail(
    to: string,
    data: {
      orderNumber: string;
      customerName: string;
    },
  ): Promise<boolean> {
    return this.sendOrderDeliveredEmail(to, {
      customerName: data.customerName,
      orderNumber: data.orderNumber,
      deliveryDate: new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }),
      items: [],
    });
  }

  /**
   * Refund notification to customer
   */
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
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Refund Confirmation</h2>
          <p>Hi ${data.customerName},</p>
          <p>Your refund has been processed.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p><strong>Refund Amount:</strong> <span style="color: #10b981; font-size: 1.2em;">$${data.refundAmount.toFixed(2)}</span></p>
            ${reasonText}
          </div>
          <p>The refund will appear in your account within 5-10 business days.</p>
        </div>
      `,
    });
  }

  isConnected(): boolean {
    return this.isConfigured;
  }
}
