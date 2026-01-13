import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { PrismaService } from '../../common/prisma.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { EmailService } from '../../common/email';

@Module({
  controllers: [RefundsController],
  providers: [
    RefundsService,
    PrismaService,
    WooCommerceService,
    EmailService,
  ],
  exports: [RefundsService],
})
export class RefundsModule {}
