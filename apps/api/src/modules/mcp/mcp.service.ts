import { Injectable, OnModuleInit } from '@nestjs/common';
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
// New Tools
import { GetProductsTool } from './tools/get-products.tool';
import { UpdateProductPriceTool } from './tools/update-product-price.tool';
import { GetCustomersTool } from './tools/get-customers.tool';
import { SendNotificationTool } from './tools/send-notification.tool';
import { CreateCouponTool } from './tools/create-coupon.tool';
import { GetShippingRatesTool } from './tools/get-shipping-rates.tool';
import { BulkImportProductsTool } from './tools/bulk-import-products.tool';
import { AnalyticsReportTool } from './tools/analytics-report.tool';

@Injectable()
export class McpService implements OnModuleInit {
  constructor(
    // Original tools
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
    // New tools
    private readonly getProductsTool: GetProductsTool,
    private readonly updateProductPriceTool: UpdateProductPriceTool,
    private readonly getCustomersTool: GetCustomersTool,
    private readonly sendNotificationTool: SendNotificationTool,
    private readonly createCouponTool: CreateCouponTool,
    private readonly getShippingRatesTool: GetShippingRatesTool,
    private readonly bulkImportProductsTool: BulkImportProductsTool,
    private readonly analyticsReportTool: AnalyticsReportTool,
  ) {}

  async onModuleInit() {
    // MCP service ready
  }

  getAvailableTools(): string[] {
    return [
      // Original 11 tools
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
      // New 8 tools
      'get_products',
      'update_product_price',
      'get_customers',
      'send_notification',
      'create_coupon',
      'get_shipping_rates',
      'bulk_import_products',
      'analytics_report',
    ];
  }

  getToolDefinitions() {
    return [
      // Original tools
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
      // New tools
      this.getProductsTool.getToolDefinition(),
      this.updateProductPriceTool.getToolDefinition(),
      this.getCustomersTool.getToolDefinition(),
      this.sendNotificationTool.getToolDefinition(),
      this.createCouponTool.getToolDefinition(),
      this.getShippingRatesTool.getToolDefinition(),
      this.bulkImportProductsTool.getToolDefinition(),
      this.analyticsReportTool.getToolDefinition(),
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, userId?: string) {
    // userId can be used for authorization in future
    // For now, it's logged for audit purposes
    if (userId) {
      console.log(`[MCP] User ${userId} executing tool: ${toolName}`);
    }
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

      // New tools
      case 'get_products':
        return this.getProductsTool.execute(
          params as {
            storeId?: string;
            search?: string;
            category?: string;
            status?: string;
            limit?: number;
            page?: number;
          },
        );

      case 'update_product_price':
        return this.updateProductPriceTool.execute(
          params as {
            productId: number;
            regularPrice?: number;
            salePrice?: number;
            storeId?: string;
          },
        );

      case 'get_customers':
        return this.getCustomersTool.execute(
          params as {
            storeId?: string;
            search?: string;
            limit?: number;
            orderBy?: 'orders' | 'spent' | 'recent';
          },
        );

      case 'send_notification':
        return this.sendNotificationTool.execute(
          params as {
            to?: string;
            orderId?: string;
            type: 'custom' | 'order_confirmation' | 'shipping_update' | 'delivery_confirmation' | 'refund';
            subject?: string;
            message?: string;
            trackingNumber?: string;
          },
        );

      case 'create_coupon':
        return this.createCouponTool.execute(
          params as {
            code?: string;
            discountType: 'percent' | 'fixed_cart' | 'fixed_product';
            amount: number;
            description?: string;
            expiryDate?: string;
            usageLimit?: number;
            usageLimitPerUser?: number;
            minimumAmount?: number;
            maximumAmount?: number;
            freeShipping?: boolean;
            productIds?: number[];
            excludedProductIds?: number[];
          },
        );

      case 'get_shipping_rates':
        return this.getShippingRatesTool.execute(
          params as {
            productId: string;
            country: string;
            quantity?: number;
            province?: string;
          },
        );

      case 'bulk_import_products':
        return this.bulkImportProductsTool.execute(
          params as {
            productIds?: string[];
            searchQuery?: string;
            categoryId?: string;
            limit?: number;
            priceMultiplier?: number;
            storeId?: string;
            status?: 'publish' | 'draft' | 'pending';
          },
        );

      case 'analytics_report':
        return this.analyticsReportTool.execute(
          params as {
            reportType: 'sales' | 'products' | 'customers' | 'profit' | 'overview' | 'trends';
            period?: string;
            storeId?: string;
            limit?: number;
          },
        );

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  }
}
