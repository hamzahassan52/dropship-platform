import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderRetryService } from './order-retry.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderRetryService: OrderRetryService,
  ) {}

  @Get()
  async getOrders(@Query('storeId') storeId?: string) {
    return this.ordersService.getOrders(storeId);
  }

  @Get('pending')
  async getPendingOrders() {
    return this.ordersService.getPendingOrders();
  }

  @Get('failed')
  async getFailedOrders() {
    return this.ordersService.getFailedOrders();
  }

  @Get('stats')
  async getOrderStats() {
    return this.ordersService.getOrderStats();
  }

  @Post('fulfill/:orderId')
  async fulfillOrder(@Param('orderId') orderId: string) {
    return this.ordersService.fulfillOrder(orderId);
  }

  @Post('fulfill/bulk')
  async bulkFulfillOrders(@Body() body: { orderIds: string[] }) {
    return this.ordersService.bulkFulfillOrders(body.orderIds);
  }

  @Post('fulfill-all')
  async fulfillAllOrders() {
    return this.ordersService.fulfillAllPendingOrders();
  }

  @Post(':orderId/retry')
  async retryOrder(@Param('orderId') orderId: string) {
    return this.orderRetryService.resetForManualRetry(orderId);
  }

  @Post(':orderId/cancel-retry')
  async cancelRetry(@Param('orderId') orderId: string) {
    return this.orderRetryService.cancelRetry(orderId);
  }

  @Post('sync-tracking')
  async syncTracking() {
    return this.ordersService.syncTrackingNumbers();
  }

  @Get('report/daily')
  async getDailyReport() {
    return this.ordersService.getDailyReport();
  }
}
