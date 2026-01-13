import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../common/prisma.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';

@Module({
  controllers: [DashboardController],
  providers: [
    DashboardService,
    PrismaService,
    WooCommerceService,
    CjDropshippingService,
  ],
})
export class DashboardModule {}
