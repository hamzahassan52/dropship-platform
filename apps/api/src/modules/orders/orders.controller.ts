import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('pending')
  async getPendingOrders() {
    return this.ordersService.getPendingOrders();
  }

  @Get('stats')
  async getOrderStats() {
    return this.ordersService.getOrderStats();
  }

  @Post('fulfill/:orderId')
  async fulfillOrder(@Param('orderId') orderId: string) {
    return this.ordersService.fulfillOrder(parseInt(orderId, 10));
  }

  @Post('fulfill-all')
  async fulfillAllOrders() {
    return this.ordersService.fulfillAllPendingOrders();
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
