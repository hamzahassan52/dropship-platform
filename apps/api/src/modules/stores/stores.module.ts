import { Module, forwardRef } from '@nestjs/common';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { PrismaService } from '../../common/prisma.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { ShopifyService } from '../../integrations/shopify/shopify.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [forwardRef(() => WebhooksModule)],
  controllers: [StoresController],
  providers: [StoresService, PrismaService, WooCommerceService, ShopifyService],
  exports: [StoresService],
})
export class StoresModule {}
