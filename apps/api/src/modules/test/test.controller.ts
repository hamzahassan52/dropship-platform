import { Controller, Post, Get, Body, Param, Query, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { StoresService } from '../stores/stores.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';
import { PrismaService } from '../../common/prisma.service';
import { E2EOrderJourneyService } from './e2e-order-journey.service';

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
    private e2eOrderJourney: E2EOrderJourneyService,
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

  // ============================================================================
  // COMPLETE E2E ORDER JOURNEY TEST
  // ============================================================================

  /**
   * Run complete E2E order journey test
   *
   * This endpoint simulates the ENTIRE order lifecycle:
   * 1. Create test user with JWT authentication
   * 2. Create test store (WooCommerce)
   * 3. Simulate customer placing order (webhook)
   * 4. Process order fulfillment (CJ simulation)
   * 5. Sync tracking number
   * 6. Mark as delivered
   * 7. Verify dashboard stats
   * 8. Test retry system
   * 9. Test AI chat integration
   * 10. Clean up all test data
   *
   * NO REAL MONEY SPENT - All external API calls are simulated
   */
  @Post('e2e/order-journey')
  async runE2EOrderJourney(@Body() options?: {
    skipCleanup?: boolean;
    skipRetryTest?: boolean;
    skipChatTest?: boolean;
    customerEmail?: string;
  }) {
    this.logger.log('Starting Complete E2E Order Journey Test...');

    const report = await this.e2eOrderJourney.runCompleteE2ETest({
      skipCleanup: options?.skipCleanup ?? false,
      skipRetryTest: options?.skipRetryTest ?? false,
      skipChatTest: options?.skipChatTest ?? false,
      customerEmail: options?.customerEmail,
    });

    return {
      success: report.success,
      summary: {
        totalTests: report.totalTests,
        passed: report.passed,
        failed: report.failed,
        skipped: report.skipped,
        successRate: `${((report.passed / report.totalTests) * 100).toFixed(1)}%`,
        duration: `${(report.duration / 1000).toFixed(2)}s`,
      },
      messages: report.summary,
      results: report.results,
    };
  }

  /**
   * Quick E2E test - skips retry and chat tests for faster execution
   */
  @Post('e2e/quick')
  async runQuickE2ETest(@Body() options?: { customerEmail?: string }) {
    return this.runE2EOrderJourney({
      skipRetryTest: true,
      skipChatTest: true,
      customerEmail: options?.customerEmail,
    });
  }

  /**
   * E2E test without cleanup - useful for debugging
   */
  @Post('e2e/debug')
  async runDebugE2ETest(@Body() options?: { customerEmail?: string }) {
    return this.runE2EOrderJourney({
      skipCleanup: true,
      customerEmail: options?.customerEmail,
    });
  }

  /**
   * Get info about E2E test capabilities
   */
  @Get('e2e/info')
  getE2ETestInfo() {
    return {
      name: 'Complete E2E Order Journey Test',
      description: 'Simulates the entire order lifecycle from customer purchase to delivery',
      phases: [
        { phase: 1, name: 'Authentication & Setup', steps: ['Create user', 'Generate JWT', 'Create store', 'Create product mapping'] },
        { phase: 2, name: 'Order Creation', steps: ['Generate mock order', 'Simulate webhook', 'Save to database', 'Send confirmation email'] },
        { phase: 3, name: 'Order Fulfillment', steps: ['Trigger fulfillment', 'CJ API simulation', 'Update status', 'Send processing email'] },
        { phase: 4, name: 'Tracking Sync', steps: ['Receive tracking', 'Update order', 'Sync to store', 'Send shipped email'] },
        { phase: 5, name: 'Delivery Confirmation', steps: ['Update status', 'Calculate profit', 'Send delivered email'] },
        { phase: 6, name: 'Dashboard Verification', steps: ['Verify order in list', 'Check stats', 'Validate profit'] },
        { phase: 7, name: 'Retry System Test', steps: ['Create failed order', 'Verify retry status', 'Test manual retry'] },
        { phase: 8, name: 'AI Chat Integration', steps: ['Test order queries', 'Test revenue queries', 'Test status queries'] },
        { phase: 9, name: 'Cleanup', steps: ['Delete orders', 'Delete store', 'Delete user', 'Delete chat messages'] },
      ],
      endpoints: {
        full: 'POST /api/test/e2e/order-journey',
        quick: 'POST /api/test/e2e/quick',
        debug: 'POST /api/test/e2e/debug (no cleanup)',
        info: 'GET /api/test/e2e/info',
      },
      options: {
        skipCleanup: 'boolean - Keep test data after test',
        skipRetryTest: 'boolean - Skip retry system test',
        skipChatTest: 'boolean - Skip AI chat integration test',
        customerEmail: 'string - Custom email for order notifications',
      },
      notes: [
        'NO REAL MONEY is spent - CJ API calls are simulated',
        'All test data is isolated and cleaned up by default',
        'Test can be run multiple times safely',
        'Emails are sent to configured SMTP if available',
      ],
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
