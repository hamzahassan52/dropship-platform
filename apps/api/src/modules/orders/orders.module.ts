import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderRetryService } from './order-retry.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';
import { EmailService } from '../../common/email/email.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  providers: [
    OrdersService,
    OrderRetryService,
    WooCommerceService,
    CjDropshippingService,
    EmailService,
    PrismaService,
  ],
  controllers: [OrdersController],
  exports: [OrdersService, OrderRetryService, WooCommerceService],
})
export class OrdersModule {}
