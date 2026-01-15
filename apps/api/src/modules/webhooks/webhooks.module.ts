import { Module, forwardRef } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WooCommerceSignatureGuard } from './guards/woocommerce-signature.guard';
import { OrdersModule } from '../orders/orders.module';
import { StoresModule } from '../stores/stores.module';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../../common/email/email.service';

@Module({
  imports: [forwardRef(() => OrdersModule), StoresModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WooCommerceSignatureGuard,
    PrismaService,
    EmailService,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {}
