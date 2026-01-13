import { Injectable } from '@nestjs/common';
import { InventoryService } from '../../inventory/inventory.service';

@Injectable()
export class SyncInventoryTool {
  constructor(private readonly inventoryService: InventoryService) {}

  getToolDefinition() {
    return {
      name: 'sync_inventory',
      description: 'Sync product inventory/stock levels from CJ Dropshipping to WooCommerce. Automatically disables out-of-stock products.',
      inputSchema: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'Optional: Specific CJ product ID to sync. If not provided, syncs all products.',
          },
          wooProductId: {
            type: 'number',
            description: 'Required if productId is provided: The WooCommerce product ID.',
          },
        },
      },
    };
  }

  async execute(params: { productId?: string; wooProductId?: number }) {
    if (params.productId && params.wooProductId) {
      const result = await this.inventoryService.syncProductInventory(
        params.productId,
        params.wooProductId,
      );
      return {
        success: result.synced,
        message: result.synced
          ? `Stock synced: ${result.previousStock} → ${result.newStock}`
          : `Sync failed: ${result.error}`,
        result,
      };
    }

    const result = await this.inventoryService.syncAllInventory();
    return {
      success: true,
      message: `Inventory sync complete: ${result.synced}/${result.total} products synced, ${result.outOfStock} out of stock`,
      summary: {
        total: result.total,
        synced: result.synced,
        failed: result.failed,
        outOfStock: result.outOfStock,
      },
    };
  }
}
