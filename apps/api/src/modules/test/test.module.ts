import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { OrdersModule } from '../orders/orders.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { StoresModule } from '../stores/stores.module';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [OrdersModule, WebhooksModule, StoresModule],
  controllers: [TestController],
  providers: [CjDropshippingService, WooCommerceService, PrismaService],
})
export class TestModule {}
