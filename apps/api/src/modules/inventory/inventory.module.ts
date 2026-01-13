import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../common/prisma.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';

@Module({
  controllers: [InventoryController],
  providers: [
    InventoryService,
    PrismaService,
    WooCommerceService,
    CjDropshippingService,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
