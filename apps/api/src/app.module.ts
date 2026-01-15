import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { McpModule } from './modules/mcp/mcp.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { StoresModule } from './modules/stores/stores.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { TestModule } from './modules/test/test.module';
import { PrismaService } from './common/prisma.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    ChatModule,
    McpModule,
    ProductsModule,
    OrdersModule,
    SchedulerModule,
    DashboardModule,
    InventoryModule,
    RefundsModule,
    StoresModule,
    WebhooksModule,
    TestModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
