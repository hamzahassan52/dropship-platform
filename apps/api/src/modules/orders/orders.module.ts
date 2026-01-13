import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';

@Module({
  providers: [OrdersService, WooCommerceService, CjDropshippingService],
  controllers: [OrdersController],
  exports: [OrdersService, WooCommerceService],
})
export class OrdersModule {}
