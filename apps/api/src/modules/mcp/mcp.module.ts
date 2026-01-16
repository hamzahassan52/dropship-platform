import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';

// Original Tools
import { SearchProductsTool } from './tools/search-products.tool';
import { GetPendingOrdersTool } from './tools/get-pending-orders.tool';
import { FulfillOrdersTool } from './tools/fulfill-orders.tool';
import { GetBusinessStatsTool } from './tools/get-business-stats.tool';
import { SyncTrackingTool } from './tools/sync-tracking.tool';
import { ImportProductTool } from './tools/import-product.tool';
import { SyncInventoryTool } from './tools/sync-inventory.tool';
import { CalculateProfitTool } from './tools/calculate-profit.tool';
import { ProcessRefundTool } from './tools/process-refund.tool';
import { ManageStoreTool } from './tools/manage-store.tool';
import { AllStoresOrdersTool } from './tools/all-stores-orders.tool';

// New Tools (8 additional)
import { GetProductsTool } from './tools/get-products.tool';
import { UpdateProductPriceTool } from './tools/update-product-price.tool';
import { GetCustomersTool } from './tools/get-customers.tool';
import { SendNotificationTool } from './tools/send-notification.tool';
import { CreateCouponTool } from './tools/create-coupon.tool';
import { GetShippingRatesTool } from './tools/get-shipping-rates.tool';
import { BulkImportProductsTool } from './tools/bulk-import-products.tool';
import { AnalyticsReportTool } from './tools/analytics-report.tool';

// Modules
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { InventoryModule } from '../inventory/inventory.module';
import { RefundsModule } from '../refunds/refunds.module';
import { StoresModule } from '../stores/stores.module';

// Integration Services
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { ShopifyService } from '../../integrations/shopify/shopify.service';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../../common/email/email.service';

@Module({
  imports: [ProductsModule, OrdersModule, InventoryModule, RefundsModule, StoresModule],
  providers: [
    McpService,
    // Original 11 tools
    SearchProductsTool,
    GetPendingOrdersTool,
    FulfillOrdersTool,
    GetBusinessStatsTool,
    SyncTrackingTool,
    ImportProductTool,
    SyncInventoryTool,
    CalculateProfitTool,
    ProcessRefundTool,
    ManageStoreTool,
    AllStoresOrdersTool,
    // New 8 tools
    GetProductsTool,
    UpdateProductPriceTool,
    GetCustomersTool,
    SendNotificationTool,
    CreateCouponTool,
    GetShippingRatesTool,
    BulkImportProductsTool,
    AnalyticsReportTool,
    // Services
    WooCommerceService,
    ShopifyService,
    CjDropshippingService,
    PrismaService,
    EmailService,
  ],
  controllers: [McpController],
  exports: [McpService],
})
export class McpModule {}
