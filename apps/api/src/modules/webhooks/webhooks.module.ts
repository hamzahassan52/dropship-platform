import { Module, forwardRef } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookSetupService } from './webhook-setup.service';
import { WooCommerceSignatureGuard } from './guards/woocommerce-signature.guard';
import { OrdersModule } from '../orders/orders.module';
import { StoresModule } from '../stores/stores.module';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { ShopifyService } from '../../integrations/shopify/shopify.service';

@Module({
  imports: [forwardRef(() => OrdersModule), StoresModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhookSetupService,
    WooCommerceSignatureGuard,
    PrismaService,
    EmailService,
    WooCommerceService,
    ShopifyService,
  ],
  exports: [WebhooksService, WebhookSetupService],
})
export class WebhooksModule {}
