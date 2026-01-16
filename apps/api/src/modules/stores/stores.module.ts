import { Module } from '@nestjs/common';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { PrismaService } from '../../common/prisma.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { ShopifyService } from '../../integrations/shopify/shopify.service';

@Module({
  controllers: [StoresController],
  providers: [StoresService, PrismaService, WooCommerceService, ShopifyService],
  exports: [StoresService],
})
export class StoresModule {}
