import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard() {
    return this.dashboardService.getDashboardStats();
  }

  @Get('recent-orders')
  async getRecentOrders(@Query('limit') limit?: string) {
    return this.dashboardService.getRecentOrders(limit ? parseInt(limit, 10) : 10);
  }

  @Get('sales-chart')
  async getSalesChart(@Query('days') days?: string) {
    return this.dashboardService.getSalesChart(days ? parseInt(days, 10) : 7);
  }

  @Get('top-products')
  async getTopProducts(@Query('limit') limit?: string) {
    return this.dashboardService.getTopProducts(limit ? parseInt(limit, 10) : 5);
  }

  @Get('alerts')
  async getAlerts() {
    return this.dashboardService.getAlerts();
  }
}
