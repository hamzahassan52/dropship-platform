import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('sync')
  async syncAllInventory() {
    return this.inventoryService.syncAllInventory();
  }

  @Post('sync/:cjProductId/:wooProductId')
  async syncProduct(
    @Param('cjProductId') cjProductId: string,
    @Param('wooProductId') wooProductId: string,
  ) {
    return this.inventoryService.syncProductInventory(
      cjProductId,
      parseInt(wooProductId, 10),
    );
  }

  @Get('low-stock')
  async getLowStock(@Query('threshold') threshold?: string) {
    return this.inventoryService.getLowStockProducts(
      threshold ? parseInt(threshold, 10) : 5,
    );
  }
}
