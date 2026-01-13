import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { InventoryService } from '../inventory/inventory.service';
import { EmailService } from '../../common/email';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly notificationEmail: string;

  constructor(
    private readonly ordersService: OrdersService,
    private readonly inventoryService: InventoryService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.notificationEmail = this.configService.get('NOTIFICATION_EMAIL') || '';
  }

  /**
   * Auto-fulfill orders every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoFulfillOrders() {
    const isEnabled = this.configService.get('AUTO_FULFILL_ENABLED') === 'true';
    if (!isEnabled) return;

    try {
      const result = await this.ordersService.fulfillAllPendingOrders();
      this.logger.log(`Auto-fulfill: ${result.successful} fulfilled, ${result.failed} failed`);

      if (this.notificationEmail && result.total > 0) {
        await this.emailService.sendFulfillmentSummaryEmail(this.notificationEmail, result);
      }
    } catch (error) {
      this.logger.error('Auto-fulfill job failed', error);
      if (this.notificationEmail) {
        await this.emailService.sendErrorAlertEmail(
          this.notificationEmail,
          'Auto-Fulfillment Failed',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }
  }

  /**
   * Sync tracking numbers every 2 hours
   */
  @Cron(CronExpression.EVERY_2_HOURS)
  async syncTrackingNumbers() {
    const isEnabled = this.configService.get('AUTO_SYNC_TRACKING_ENABLED') === 'true';
    if (!isEnabled) return;

    try {
      const result = await this.ordersService.syncTrackingNumbers();
      this.logger.log(`Tracking sync: ${result.updated} orders updated`);

      // Send tracking update emails for each order
      if (this.notificationEmail) {
        for (const order of result.orders) {
          await this.emailService.sendTrackingUpdateEmail(
            this.notificationEmail,
            `WOO-${order.orderId}`,
            order.trackingNumber,
          );
        }
      }
    } catch (error) {
      this.logger.error('Tracking sync job failed', error);
      if (this.notificationEmail) {
        await this.emailService.sendErrorAlertEmail(
          this.notificationEmail,
          'Tracking Sync Failed',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }
  }

  /**
   * Generate daily report at 9 AM
   */
  @Cron('0 9 * * *')
  async generateDailyReport() {
    try {
      const report = await this.ordersService.getDailyReport();
      this.logger.log(
        `Daily report: Revenue $${report.revenue}, Profit $${report.profit}, Orders ${report.orders.new}`,
      );

      if (this.notificationEmail) {
        await this.emailService.sendDailyReportEmail(this.notificationEmail, report);
      }
    } catch (error) {
      this.logger.error('Daily report generation failed', error);
      if (this.notificationEmail) {
        await this.emailService.sendErrorAlertEmail(
          this.notificationEmail,
          'Daily Report Failed',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }
  }

  /**
   * Sync inventory every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async syncInventory() {
    const isEnabled = this.configService.get('AUTO_SYNC_INVENTORY_ENABLED') === 'true';
    if (!isEnabled) return;

    try {
      const result = await this.inventoryService.syncAllInventory();
      this.logger.log(
        `Inventory sync: ${result.synced}/${result.total} synced, ${result.outOfStock} out of stock`,
      );
    } catch (error) {
      this.logger.error('Inventory sync job failed', error);
      if (this.notificationEmail) {
        await this.emailService.sendErrorAlertEmail(
          this.notificationEmail,
          'Inventory Sync Failed',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }
  }
}
