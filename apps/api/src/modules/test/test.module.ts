import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TestController } from './test.controller';
import { E2EOrderJourneyService } from './e2e-order-journey.service';
import { OrdersModule } from '../orders/orders.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { StoresModule } from '../stores/stores.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ChatModule } from '../chat/chat.module';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../../common/email/email.service';

@Module({
  imports: [
    OrdersModule,
    WebhooksModule,
    StoresModule,
    DashboardModule,
    ChatModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default-secret'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TestController],
  providers: [
    E2EOrderJourneyService,
    CjDropshippingService,
    WooCommerceService,
    PrismaService,
    EmailService,
  ],
})
export class TestModule {}
