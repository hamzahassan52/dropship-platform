import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RefundsService, RefundRequest } from './refunds.service';

@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  async processRefund(@Body() request: RefundRequest) {
    return this.refundsService.processRefund(request);
  }

  @Post('cancel/:orderId')
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Body('reason') reason: string,
  ) {
    return this.refundsService.cancelOrder(orderId, reason || 'Cancelled by user');
  }

  @Get('stats')
  async getRefundStats() {
    return this.refundsService.getRefundStats();
  }

  @Get('pending')
  async getPendingReturns() {
    return this.refundsService.getPendingReturns();
  }
}
