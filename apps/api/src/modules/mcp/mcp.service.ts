import { Injectable, OnModuleInit } from '@nestjs/common';
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

@Injectable()
export class McpService implements OnModuleInit {
  constructor(
    private readonly searchProductsTool: SearchProductsTool,
    private readonly getPendingOrdersTool: GetPendingOrdersTool,
    private readonly fulfillOrdersTool: FulfillOrdersTool,
    private readonly getBusinessStatsTool: GetBusinessStatsTool,
    private readonly syncTrackingTool: SyncTrackingTool,
    private readonly importProductTool: ImportProductTool,
    private readonly syncInventoryTool: SyncInventoryTool,
    private readonly calculateProfitTool: CalculateProfitTool,
    private readonly processRefundTool: ProcessRefundTool,
    private readonly manageStoreTool: ManageStoreTool,
    private readonly allStoresOrdersTool: AllStoresOrdersTool,
  ) {}

  async onModuleInit() {
    // MCP service ready
  }

  getAvailableTools(): string[] {
    return [
      'search_products',
      'get_pending_orders',
      'fulfill_orders',
      'get_business_stats',
      'sync_tracking',
      'import_product',
      'sync_inventory',
      'calculate_profit',
      'process_refund',
      'manage_store',
      'get_all_stores_orders',
    ];
  }

  getToolDefinitions() {
    return [
      this.searchProductsTool.getToolDefinition(),
      this.getPendingOrdersTool.getToolDefinition(),
      this.fulfillOrdersTool.getToolDefinition(),
      this.getBusinessStatsTool.getToolDefinition(),
      this.syncTrackingTool.getToolDefinition(),
      this.importProductTool.getToolDefinition(),
      this.syncInventoryTool.getToolDefinition(),
      this.calculateProfitTool.getToolDefinition(),
      this.processRefundTool.getToolDefinition(),
      this.manageStoreTool.getToolDefinition(),
      this.allStoresOrdersTool.getToolDefinition(),
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>) {
    switch (toolName) {
      case 'search_products':
        return this.searchProductsTool.execute(params);

      case 'get_pending_orders':
        return this.getPendingOrdersTool.execute();

      case 'fulfill_orders':
        return this.fulfillOrdersTool.execute(params as { orderId?: number; all?: boolean });

      case 'get_business_stats':
        return this.getBusinessStatsTool.execute(params as { period?: 'today' | 'week' | 'month' });

      case 'sync_tracking':
        return this.syncTrackingTool.execute();

      case 'import_product':
        return this.importProductTool.execute(
          params as { cjProductId: string; sellingPrice: number; title?: string },
        );

      case 'sync_inventory':
        return this.syncInventoryTool.execute(
          params as { productId?: string; wooProductId?: number },
        );

      case 'calculate_profit':
        return this.calculateProfitTool.execute(
          params as {
            cjProductId: string;
            sellingPrice: number;
            quantity?: number;
            country?: string;
            platformFee?: number;
          },
        );

      case 'process_refund':
        return this.processRefundTool.execute(
          params as {
            orderId: string;
            action: 'refund' | 'cancel';
            reason: string;
            amount?: number;
          },
        );

      case 'manage_store':
        return this.manageStoreTool.execute(
          params as {
            action: 'add' | 'remove' | 'list' | 'toggle' | 'stats';
            storeId?: string;
            name?: string;
            platform?: 'WOOCOMMERCE' | 'SHOPIFY';
            storeUrl?: string;
            consumerKey?: string;
            consumerSecret?: string;
            accessToken?: string;
          },
        );

      case 'get_all_stores_orders':
        return this.allStoresOrdersTool.execute(
          params as {
            status?: string;
            storeId?: string;
            limit?: number;
            stats?: boolean;
          },
        );

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  }
}
