import { Controller, Post, Get, Body, Param, Query, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { StoresService } from '../stores/stores.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';
import { PrismaService } from '../../common/prisma.service';

@Controller('test')
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor(
    private ordersService: OrdersService,
    private webhooksService: WebhooksService,
    private storesService: StoresService,
    private wooCommerce: WooCommerceService,
    private cjService: CjDropshippingService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get system status and connection info
   */
  @Get('status')
  async getSystemStatus() {
    const simulationMode = this.configService.get('CJ_SIMULATION_MODE') === 'true';
    let wooConnected = false;
    let cjConnected = false;

    try {
      wooConnected = await this.wooCommerce.testConnection();
    } catch (e) {
      this.logger.warn('WooCommerce connection test failed');
    }

    try {
      const categories = await this.cjService.getCategories();
      cjConnected = categories.length > 0;
    } catch (e) {
      this.logger.warn('CJ connection test failed');
    }

    const storeCount = await this.prisma.store.count();
    const orderCount = await this.prisma.order.count();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV') || 'development',
      connections: {
        woocommerce: wooConnected,
        cjDropshipping: cjConnected,
      },
      config: {
        simulationMode,
        autoFulfillEnabled: this.configService.get('AUTO_FULFILL_ENABLED') === 'true',
        autoSyncTrackingEnabled: this.configService.get('AUTO_SYNC_TRACKING_ENABLED') === 'true',
      },
      database: {
        stores: storeCount,
        orders: orderCount,
      },
    };
  }

  /**
   * Setup a test store with WooCommerce credentials
   */
  @Post('setup/store')
  async setupTestStore(@Body() body: {
    userId?: string;
    name: string;
    storeUrl: string;
    consumerKey: string;
    consumerSecret: string;
    webhookSecret?: string;
  }) {
    const userId = body.userId || 'test-user';

    // Check if user exists, create if not
    let user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@test.local`,
          password: 'test-password-hash',
          firstName: 'Test',
          lastName: 'User',
        },
      });
    }

    const result = await this.storesService.addStore(userId, {
      name: body.name,
      platform: 'WOOCOMMERCE',
      storeUrl: body.storeUrl,
      credentials: {
        woocommerce: {
          consumerKey: body.consumerKey,
          consumerSecret: body.consumerSecret,
        },
        webhookSecret: body.webhookSecret,
      },
      settings: {
        autoFulfill: true,
        autoSyncTracking: true,
        autoSyncInventory: true,
      },
    });

    if (result.success && result.store && body.webhookSecret) {
      await this.storesService.updateWebhookSecret(result.store.id, body.webhookSecret);
    }

    return result;
  }

  /**
   * Create a product mapping for testing
   */
  @Post('setup/product-mapping')
  async createProductMapping(@Body() body: {
    storeId: string;
    wooProductId: number;
    wooSku: string;
    cjProductId: string;
    supplierPrice: number;
    isTestProduct?: boolean;
  }) {
    const mapping = await this.prisma.productMapping.create({
      data: {
        storeId: body.storeId,
        wooProductId: body.wooProductId,
        wooSku: body.wooSku,
        cjProductId: body.cjProductId,
        supplierPrice: body.supplierPrice,
        isTestProduct: body.isTestProduct ?? true,
      },
    });

    return { success: true, mapping };
  }

  /**
   * Simulate full order flow with a mock order
   */
  @Post('order/simulate')
  async simulateOrder(@Body() mockOrder?: Partial<MockOrderPayload>) {
    const order = this.createMockOrder(mockOrder);
    const storeId = mockOrder?.storeId || 'test-store';

    this.logger.log(`Simulating order ${order.id} for store ${storeId}`);

    // Process with forced simulation
    const result = await this.ordersService.fulfillOrderFromWebhook(
      storeId,
      order,
      { simulationMode: true },
    );

    return {
      success: result.success,
      orderId: order.id,
      cjOrderId: result.cjOrderId,
      simulated: result.simulated,
      error: result.error,
      message: result.success
        ? 'Order simulated successfully! Check database for the order record.'
        : 'Order simulation failed',
    };
  }

  /**
   * Trigger webhook manually for testing (simulates WooCommerce webhook)
   */
  @Post('webhook/trigger/:storeId')
  async triggerWebhook(
    @Param('storeId') storeId: string,
    @Body() body: { topic?: string; payload?: any },
  ) {
    const topic = body.topic || 'order.created';
    const payload = body.payload || this.createMockOrder();

    this.logger.log(`Manual webhook trigger: ${topic} for store ${storeId}`);

    if (topic === 'order.created') {
      return this.webhooksService.handleOrderCreated(storeId, payload);
    } else if (topic === 'order.updated') {
      return this.webhooksService.handleOrderUpdated(storeId, payload);
    }

    return { received: true, processed: false, topic };
  }

  /**
   * Fetch pending orders from WooCommerce
   */
  @Get('woocommerce/orders')
  async getWooOrders(@Query('status') status?: string) {
    try {
      const orders = await this.wooCommerce.getOrders({
        status: status || 'processing',
        per_page: 10,
      });

      return {
        success: true,
        count: orders.length,
        orders: orders.map(o => ({
          id: o.id,
          status: o.status,
          total: o.total,
          customer: o.billing?.email,
          items: o.line_items?.length || 0,
          created: o.date_created,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch orders',
      };
    }
  }

  /**
   * Test CJ API with simulation
   */
  @Post('cj/simulate-order')
  async simulateCjOrder(@Body() body?: { items?: Array<{ cjProductId: string; quantity: number }> }) {
    const items = body?.items || [{ cjProductId: 'test-product-id', quantity: 1 }];

    const result = await this.cjService.placeOrder(
      {
        orderNumber: `TEST-${Date.now()}`,
        shippingAddress: {
          name: 'Test Customer',
          address1: '123 Test Street',
          city: 'Test City',
          state: 'CA',
          postalCode: '90210',
          country: 'US',
          phone: '555-0100',
        },
        items: items.map(i => ({
          sku: `SKU-${i.cjProductId}`,
          quantity: i.quantity,
          cjProductId: i.cjProductId,
        })),
      },
      { forceSimulation: true },
    );

    return result;
  }

  /**
   * Test tracking sync (will process simulated orders)
   */
  @Post('sync/tracking')
  async syncTracking() {
    this.logger.log('Manual tracking sync triggered');
    const result = await this.ordersService.syncTrackingNumbers();
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get all orders from database
   */
  @Get('orders')
  async getOrders(@Query('limit') limit?: string) {
    const orders = await this.prisma.order.findMany({
      take: parseInt(limit || '20'),
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        store: {
          select: { name: true, platform: true },
        },
      },
    });

    return {
      count: orders.length,
      orders: orders.map(o => ({
        id: o.id,
        externalOrderId: o.externalOrderId,
        status: o.status,
        total: o.total,
        profit: o.profit,
        customerEmail: o.customerEmail,
        supplierOrderId: o.supplierOrderId,
        trackingNumber: o.trackingNumber,
        carrier: o.carrier,
        itemCount: o.items.length,
        store: o.store?.name,
        createdAt: o.createdAt,
      })),
    };
  }

  /**
   * Get webhook logs
   */
  @Get('webhooks/logs/:storeId')
  async getWebhookLogs(
    @Param('storeId') storeId: string,
    @Query('limit') limit?: string,
  ) {
    const logs = await this.webhooksService.getWebhookLogs(storeId, parseInt(limit || '20'));
    return { count: logs.length, logs };
  }

  /**
   * Full end-to-end test: Create order → Fulfill → Sync tracking
   */
  @Post('e2e/full-flow')
  async runFullE2ETest(@Body() body?: { storeId?: string }) {
    const storeId = body?.storeId || 'test-store';
    const results: any[] = [];

    // Step 1: Create mock order
    const mockOrder = this.createMockOrder();
    results.push({ step: 'create_order', orderId: mockOrder.id });

    // Step 2: Process via webhook handler
    const webhookResult = await this.webhooksService.handleOrderCreated(storeId, mockOrder);
    results.push({ step: 'process_webhook', ...webhookResult });

    if (!webhookResult.processed) {
      return {
        success: false,
        message: 'Webhook processing failed',
        results,
      };
    }

    // Step 3: Wait briefly for simulated order to "ship"
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Sync tracking
    const trackingResult = await this.ordersService.syncTrackingNumbers();
    results.push({ step: 'sync_tracking', ...trackingResult });

    // Step 5: Get final order state
    const finalOrder = await this.prisma.order.findFirst({
      where: { externalOrderId: String(mockOrder.id) },
      include: { items: true },
    });

    results.push({
      step: 'final_state',
      order: finalOrder ? {
        id: finalOrder.id,
        status: finalOrder.status,
        trackingNumber: finalOrder.trackingNumber,
        carrier: finalOrder.carrier,
      } : null,
    });

    return {
      success: true,
      message: 'Full E2E test completed',
      results,
    };
  }

  /**
   * Clear test data
   */
  @Post('cleanup')
  async cleanupTestData() {
    // Delete orders with simulated supplier IDs
    const deletedOrders = await this.prisma.order.deleteMany({
      where: {
        supplierOrderId: { startsWith: 'SIM-' },
      },
    });

    // Delete test webhook logs
    const deletedLogs = await this.prisma.webhookLog.deleteMany({
      where: {
        deliveryId: { startsWith: 'test-' },
      },
    });

    return {
      success: true,
      deleted: {
        orders: deletedOrders.count,
        webhookLogs: deletedLogs.count,
      },
    };
  }

  /**
   * Create mock order for testing
   */
  private createMockOrder(overrides?: Partial<MockOrderPayload>): MockOrderPayload {
    const orderId = overrides?.id || Math.floor(Math.random() * 100000);
    return {
      id: orderId,
      status: overrides?.status || 'processing',
      currency: 'USD',
      total: overrides?.total || '29.99',
      billing: {
        first_name: 'Test',
        last_name: 'Customer',
        email: overrides?.billing?.email || 'test@example.com',
        phone: '555-0100',
        address_1: '123 Test Street',
        city: 'Los Angeles',
        state: 'CA',
        postcode: '90210',
        country: 'US',
        ...overrides?.billing,
      },
      shipping: {
        first_name: 'Test',
        last_name: 'Customer',
        address_1: '123 Test Street',
        address_2: '',
        city: 'Los Angeles',
        state: 'CA',
        postcode: '90210',
        country: 'US',
        phone: '555-0100',
        ...overrides?.shipping,
      },
      line_items: overrides?.line_items || [
        {
          id: 1,
          name: 'Test Product',
          product_id: 100,
          variation_id: 0,
          quantity: 1,
          price: '29.99',
          sku: 'TEST-SKU-001',
          meta_data: [
            { key: '_cj_product_id', value: 'test-cj-product-id' },
            { key: '_supplier_price', value: '10.00' },
          ],
        },
      ],
      date_created: new Date().toISOString(),
      date_modified: new Date().toISOString(),
      payment_method: 'stripe',
      transaction_id: `test-txn-${orderId}`,
    };
  }
}

interface MockOrderPayload {
  id: number;
  storeId?: string;
  status: string;
  currency: string;
  total: string;
  billing: any;
  shipping: any;
  line_items: any[];
  date_created: string;
  date_modified: string;
  payment_method: string;
  transaction_id: string;
}
