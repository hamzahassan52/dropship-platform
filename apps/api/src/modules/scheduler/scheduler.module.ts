import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { OrdersModule } from '../orders/orders.module';
import { InventoryModule } from '../inventory/inventory.module';
import { EmailService } from '../../common/email';

@Module({
  imports: [OrdersModule, InventoryModule],
  providers: [SchedulerService, EmailService],
})
export class SchedulerModule {}
