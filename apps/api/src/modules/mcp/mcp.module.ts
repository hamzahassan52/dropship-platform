import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';

// Tools
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

// Modules
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { InventoryModule } from '../inventory/inventory.module';
import { RefundsModule } from '../refunds/refunds.module';
import { StoresModule } from '../stores/stores.module';

@Module({
  imports: [ProductsModule, OrdersModule, InventoryModule, RefundsModule, StoresModule],
  providers: [
    McpService,
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
  ],
  controllers: [McpController],
  exports: [McpService],
})
export class McpModule {}
