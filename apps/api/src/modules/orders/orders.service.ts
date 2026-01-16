import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { WooCommerceService, WooOrder } from '../../integrations/woocommerce/woocommerce.service';
import { CjDropshippingService, CJOrderPlacementResult } from '../../integrations/cj-dropshipping/cj-dropshipping.service';
import { EmailService } from '../../common/email/email.service';

export interface OrderSyncResult {
  success: boolean;
  orderId: number;
  cjOrderId?: string;
  error?: string;
  simulated?: boolean;
}

export interface FulfillmentResult {
  total: number;
  successful: number;
  failed: number;
  results: OrderSyncResult[];
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private wooCommerce: WooCommerceService,
    private cjDropshipping: CjDropshippingService,
    private emailService: EmailService,
  ) {}

  /**
   * Get all pending orders from WooCommerce
   */
  async getPendingOrders(): Promise<WooOrder[]> {
    return this.wooCommerce.getPendingOrders();
  }

  /**
   * Get order statistics
   */
  async getOrderStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    total: number;
    todayRevenue: number;
    todayProfit: number;
  }> {
    const counts = await this.wooCommerce.getOrderCounts();

    // Get today's orders from database
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: today },
      },
    });

    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const todayProfit = todayOrders.reduce((sum, order) => sum + order.profit, 0);

    return {
      pending: counts['pending'] || 0,
      processing: counts['processing'] || 0,
      completed: counts['completed'] || 0,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      todayRevenue,
      todayProfit,
    };
  }

  /**
   * Auto-fulfill single order: WooCommerce → CJ
   */
  async fulfillOrder(wooOrderId: number): Promise<OrderSyncResult> {
    try {
      // 1. Get order from WooCommerce
      const wooOrder = await this.wooCommerce.getOrder(wooOrderId);
      if (!wooOrder) {
        return { success: false, orderId: wooOrderId, error: 'Order not found in WooCommerce' };
      }

      // 2. Prepare CJ order data
      const cjOrderData = this.prepareCjOrderData(wooOrder);

      // 3. Place order on CJ Dropshipping
      const cjResult = await this.cjDropshipping.placeOrder(cjOrderData);
      if (!cjResult.success || !cjResult.cjOrderId) {
        return { success: false, orderId: wooOrderId, error: cjResult.error || 'Failed to place order on CJ' };
      }

      // 4. Save to our database
      await this.saveOrderToDatabase(wooOrder, cjResult.cjOrderId);

      // 5. Update WooCommerce order status
      await this.wooCommerce.updateOrderStatus(wooOrderId, 'processing');

      return { success: true, orderId: wooOrderId, cjOrderId: cjResult.cjOrderId, simulated: cjResult.simulated };
    } catch (error) {
      return {
        success: false,
        orderId: wooOrderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fulfill order from webhook payload (real-time processing)
   */
  async fulfillOrderFromWebhook(
    storeId: string,
    orderPayload: any,
    options: { simulationMode?: boolean } = {},
  ): Promise<OrderSyncResult & { simulated?: boolean }> {
    const wooOrderId = orderPayload.id;
    this.logger.log(`Processing webhook order ${wooOrderId} for store ${storeId}`);

    try {
      // Check if order already exists
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          storeId,
          externalOrderId: String(wooOrderId),
        },
      });

      if (existingOrder) {
        this.logger.warn(`Order ${wooOrderId} already exists, skipping`);
        return {
          success: false,
          orderId: wooOrderId,
          error: 'Order already processed',
        };
      }

      // Prepare CJ order data from webhook payload
      const cjOrderData = this.prepareCjOrderDataFromPayload(orderPayload);

      // Place order on CJ Dropshipping (with simulation support)
      const cjResult = await this.cjDropshipping.placeOrder(cjOrderData, {
        forceSimulation: options.simulationMode,
      });

      if (!cjResult.success || !cjResult.cjOrderId) {
        this.logger.error(`Failed to place order on CJ: ${cjResult.error}`);
        return {
          success: false,
          orderId: wooOrderId,
          error: cjResult.error || 'Failed to place order on CJ',
          simulated: cjResult.simulated,
        };
      }

      // Save to database
      await this.saveOrderFromWebhook(storeId, orderPayload, cjResult.cjOrderId);

      // Update WooCommerce order status (only if not simulated in production)
      if (!cjResult.simulated) {
        await this.wooCommerce.updateOrderStatus(wooOrderId, 'processing');
      }

      // Send thank you email to customer
      const billing = orderPayload.billing || {};
      const shipping = orderPayload.shipping || {};
      if (billing.email) {
        try {
          const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Valued Customer';
          const shippingAddress = [
            `${shipping.first_name || billing.first_name || ''} ${shipping.last_name || billing.last_name || ''}`.trim(),
            shipping.address_1 || billing.address_1,
            shipping.address_2 || billing.address_2,
            `${shipping.city || billing.city || ''}, ${shipping.state || billing.state || ''} ${shipping.postcode || billing.postcode || ''}`,
            shipping.country || billing.country || '',
          ].filter(Boolean).join('<br>');

          const items = (orderPayload.line_items || []).map((item: any) => ({
            name: item.name || 'Product',
            quantity: item.quantity || 1,
            price: parseFloat(item.price) || 0,
          }));

          await this.emailService.sendOrderConfirmationEmail(billing.email, {
            orderNumber: String(orderPayload.id),
            customerName,
            items,
            total: parseFloat(orderPayload.total) || 0,
            shippingAddress,
          });
          this.logger.log(`Thank you email sent to ${billing.email}`);
        } catch (error) {
          this.logger.warn(`Failed to send thank you email: ${error}`);
        }
      }

      this.logger.log(`Order ${wooOrderId} fulfilled successfully (CJ: ${cjResult.cjOrderId})`);

      return {
        success: true,
        orderId: wooOrderId,
        cjOrderId: cjResult.cjOrderId,
        simulated: cjResult.simulated,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process order ${wooOrderId}: ${errorMessage}`);
      return {
        success: false,
        orderId: wooOrderId,
        error: errorMessage,
      };
    }
  }

  /**
   * Prepare CJ order data from webhook payload
   */
  private prepareCjOrderDataFromPayload(orderPayload: any): CjOrderData {
    const shipping = orderPayload.shipping || {};
    const billing = orderPayload.billing || {};

    return {
      orderNumber: `WOO-${orderPayload.id}`,
      shippingAddress: {
        name: `${shipping.first_name || billing.first_name || ''} ${shipping.last_name || billing.last_name || ''}`.trim(),
        address1: shipping.address_1 || billing.address_1 || '',
        address2: shipping.address_2 || billing.address_2 || '',
        city: shipping.city || billing.city || '',
        state: shipping.state || billing.state || '',
        postalCode: shipping.postcode || billing.postcode || '',
        country: shipping.country || billing.country || 'US',
        phone: shipping.phone || billing.phone || '',
      },
      items: (orderPayload.line_items || []).map((item: any) => ({
        sku: item.sku || '',
        quantity: item.quantity || 1,
        cjProductId: item.meta_data?.find((m: any) => m.key === '_cj_product_id')?.value || item.sku || 'test-product',
      })),
    };
  }

  /**
   * Save order from webhook payload to database
   */
  private async saveOrderFromWebhook(
    storeId: string,
    orderPayload: any,
    cjOrderId: string,
  ): Promise<void> {
    const totalCost = (orderPayload.line_items || []).reduce((sum: number, item: any) => {
      const supplierPrice = parseFloat(
        item.meta_data?.find((m: any) => m.key === '_supplier_price')?.value || '0'
      );
      return sum + (supplierPrice * (item.quantity || 1));
    }, 0);

    const total = parseFloat(orderPayload.total) || 0;
    const profit = total - totalCost;

    // Get userId from store, or use/create a default user
    let userId = 'default-user';
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { userId: true },
    });

    if (store?.userId) {
      userId = store.userId;
    } else {
      // Ensure default user exists
      const defaultUser = await this.prisma.user.findUnique({
        where: { id: 'default-user' },
      });
      if (!defaultUser) {
        await this.prisma.user.create({
          data: {
            id: 'default-user',
            email: 'default@system.local',
            password: 'system-user-no-login',
            firstName: 'System',
            lastName: 'User',
          },
        });
      }
    }

    // Ensure store exists for foreign key constraint
    const storeExists = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!storeExists) {
      // Create a temporary store for testing
      await this.prisma.store.create({
        data: {
          id: storeId,
          userId,
          name: 'Test Store',
          platform: 'WOOCOMMERCE',
          storeUrl: 'https://test-store.com',
          credentials: {},
        },
      });
    }

    const billing = orderPayload.billing || {};
    const shipping = orderPayload.shipping || {};

    await this.prisma.order.create({
      data: {
        userId,
        storeId,
        externalOrderId: String(orderPayload.id),
        customerEmail: billing.email || '',
        customerName: `${billing.first_name || ''} ${billing.last_name || ''}`.trim(),
        shippingAddress: shipping as any,
        subtotal: total,
        shippingCost: 0,
        total,
        profit,
        status: 'PROCESSING',
        supplierOrderId: cjOrderId,
        items: {
          create: (orderPayload.line_items || []).map((item: any) => ({
            productTitle: item.name || 'Unknown Product',
            quantity: item.quantity || 1,
            unitPrice: parseFloat(item.price) || 0,
            supplierPrice: parseFloat(
              item.meta_data?.find((m: any) => m.key === '_supplier_price')?.value || '0'
            ),
            supplierProductId: item.meta_data?.find((m: any) => m.key === '_cj_product_id')?.value || item.sku || 'unknown',
          })),
        },
      },
    });
  }

  /**
   * Auto-fulfill ALL pending orders
   */
  async fulfillAllPendingOrders(): Promise<FulfillmentResult> {
    const pendingOrders = await this.getPendingOrders();
    const results: OrderSyncResult[] = [];

    for (const order of pendingOrders) {
      const result = await this.fulfillOrder(order.id);
      results.push(result);

      // Small delay to avoid rate limiting
      await this.delay(500);
    }

    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  /**
   * Sync tracking numbers from CJ to WooCommerce and send customer emails
   */
  async syncTrackingNumbers(): Promise<{
    updated: number;
    orders: Array<{ orderId: number; trackingNumber: string; simulated?: boolean }>;
  }> {
    // Get orders that are processing but don't have tracking yet
    const ordersNeedingTracking = await this.prisma.order.findMany({
      where: {
        status: 'PROCESSING',
        trackingNumber: null,
        supplierOrderId: { not: null },
      },
    });

    this.logger.log(`Found ${ordersNeedingTracking.length} orders needing tracking sync`);

    const updated: Array<{ orderId: number; trackingNumber: string; simulated?: boolean }> = [];

    for (const order of ordersNeedingTracking) {
      if (!order.supplierOrderId) continue;

      // Detect if this is a simulated order
      const isSimulated = order.supplierOrderId.startsWith('SIM-');

      // Get tracking from CJ (simulation-aware)
      const tracking = await this.cjDropshipping.getOrderTracking(order.supplierOrderId, {
        forceSimulation: isSimulated,
      });

      if (tracking?.trackingNumber) {
        // Update our database
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            trackingNumber: tracking.trackingNumber,
            carrier: tracking.carrier,
            status: 'SHIPPED',
          },
        });

        // Update WooCommerce (use externalOrderId)
        const wooOrderId = parseInt(order.externalOrderId || '0');
        if (wooOrderId && !isSimulated) {
          try {
            await this.wooCommerce.addTrackingToOrder(
              wooOrderId,
              tracking.trackingNumber,
              tracking.carrier || 'CJ Dropshipping',
            );
          } catch (error) {
            this.logger.warn(`Failed to update WooCommerce order ${wooOrderId}: ${error}`);
          }
        }

        // Send shipping notification email to customer
        if (order.customerEmail) {
          try {
            await this.emailService.sendShippingNotificationEmail(order.customerEmail, {
              orderNumber: order.externalOrderId || order.id,
              customerName: order.customerName || 'Valued Customer',
              trackingNumber: tracking.trackingNumber,
              carrier: tracking.carrier || 'CJ Logistics',
            });
            this.logger.log(`Shipping notification sent to ${order.customerEmail}`);
          } catch (error) {
            this.logger.warn(`Failed to send shipping email: ${error}`);
          }
        }

        updated.push({
          orderId: wooOrderId,
          trackingNumber: tracking.trackingNumber,
          simulated: isSimulated,
        });

        this.logger.log(`Tracking synced for order ${order.id}: ${tracking.trackingNumber}`);
      }

      await this.delay(300);
    }

    return { updated: updated.length, orders: updated };
  }

  /**
   * Get daily report
   */
  async getDailyReport(): Promise<{
    date: string;
    orders: {
      new: number;
      fulfilled: number;
      shipped: number;
      delivered: number;
    };
    revenue: number;
    profit: number;
    topProducts: Array<{ name: string; quantity: number; revenue: number }>;
    alerts: string[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's orders
    const todayOrders = await this.prisma.order.findMany({
      where: { createdAt: { gte: today } },
      include: { items: true },
    });

    // Calculate stats
    const revenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const profit = todayOrders.reduce((sum, o) => sum + o.profit, 0);

    // Count by status
    const statusCounts = {
      new: todayOrders.filter(o => o.status === 'PENDING').length,
      fulfilled: todayOrders.filter(o => o.status === 'PROCESSING').length,
      shipped: todayOrders.filter(o => o.status === 'SHIPPED').length,
      delivered: todayOrders.filter(o => o.status === 'DELIVERED').length,
    };

    // Top products
    const productSales: Record<string, { quantity: number; revenue: number }> = {};
    for (const order of todayOrders) {
      for (const item of order.items) {
        if (!productSales[item.productTitle]) {
          productSales[item.productTitle] = { quantity: 0, revenue: 0 };
        }
        productSales[item.productTitle].quantity += item.quantity;
        productSales[item.productTitle].revenue += item.unitPrice * item.quantity;
      }
    }

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Generate alerts
    const alerts: string[] = [];
    const pendingCount = await this.prisma.order.count({
      where: { status: 'PENDING' },
    });
    if (pendingCount > 10) {
      alerts.push(`${pendingCount} orders pending fulfillment`);
    }

    return {
      date: today.toISOString().split('T')[0],
      orders: statusCounts,
      revenue,
      profit,
      topProducts,
      alerts,
    };
  }

  // ============ PRIVATE HELPERS ============

  private prepareCjOrderData(wooOrder: WooOrder): CjOrderData {
    return {
      orderNumber: `WOO-${wooOrder.id}`,
      shippingAddress: {
        name: `${wooOrder.shipping.first_name} ${wooOrder.shipping.last_name}`,
        address1: wooOrder.shipping.address_1,
        address2: wooOrder.shipping.address_2,
        city: wooOrder.shipping.city,
        state: wooOrder.shipping.state,
        postalCode: wooOrder.shipping.postcode,
        country: wooOrder.shipping.country,
        phone: wooOrder.shipping.phone || wooOrder.billing.phone,
      },
      items: wooOrder.line_items.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
        // Get CJ product ID from meta data if stored
        cjProductId: item.meta_data.find(m => m.key === '_cj_product_id')?.value || '',
      })),
    };
  }

  private async saveOrderToDatabase(wooOrder: WooOrder, cjOrderId: string): Promise<void> {
    const totalCost = wooOrder.line_items.reduce((sum, item) => {
      // Get supplier price from meta data
      const supplierPrice = parseFloat(
        item.meta_data.find(m => m.key === '_supplier_price')?.value || '0'
      );
      return sum + (supplierPrice * item.quantity);
    }, 0);

    const total = parseFloat(wooOrder.total);
    const profit = total - totalCost;

    await this.prisma.order.create({
      data: {
        id: `WOO-${wooOrder.id}`,
        userId: 'default', // TODO: Multi-user support
        storeId: 'woocommerce-main', // TODO: Multi-store support
        customerEmail: wooOrder.billing.email || '',
        shippingAddress: wooOrder.shipping as any,
        subtotal: total,
        shippingCost: 0,
        total,
        profit,
        status: 'PROCESSING',
        supplierOrderId: cjOrderId,
        items: {
          create: wooOrder.line_items.map(item => ({
            productTitle: item.name,
            quantity: item.quantity,
            unitPrice: parseFloat(item.price),
            supplierPrice: parseFloat(
              item.meta_data.find(m => m.key === '_supplier_price')?.value || '0'
            ),
            supplierProductId: item.meta_data.find(m => m.key === '_cj_product_id')?.value || item.sku,
          })),
        },
      },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Types for CJ order
interface CjOrderData {
  orderNumber: string;
  shippingAddress: {
    name: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  items: Array<{
    sku: string;
    quantity: number;
    cjProductId: string;
  }>;
}
