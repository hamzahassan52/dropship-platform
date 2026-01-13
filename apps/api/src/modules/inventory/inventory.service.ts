import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { WooCommerceService } from '../../integrations/woocommerce/woocommerce.service';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';

export interface StockSyncResult {
  productId: string;
  wooProductId: number;
  previousStock: number;
  newStock: number;
  synced: boolean;
  error?: string;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private prisma: PrismaService,
    private wooCommerce: WooCommerceService,
    private cjDropshipping: CjDropshippingService,
  ) {}

  /**
   * Sync stock levels from CJ to WooCommerce for all products
   */
  async syncAllInventory(): Promise<{
    total: number;
    synced: number;
    failed: number;
    outOfStock: number;
    results: StockSyncResult[];
  }> {
    const results: StockSyncResult[] = [];
    let outOfStock = 0;

    // Get all products from database that have CJ product IDs
    const products = await this.prisma.product.findMany({
      where: {
        source: 'CJ_DROPSHIPPING',
      },
    });

    for (const product of products) {
      try {
        // Check stock at CJ
        const stockInfo = await this.cjDropshipping.checkStock(product.externalId);

        // Get WooCommerce product (need to find by SKU or meta)
        const wooProducts = await this.wooCommerce.getProducts({
          per_page: 1,
        });

        // Find matching WooCommerce product by SKU
        const wooProduct = wooProducts.find(p => p.sku === product.externalId);

        if (!wooProduct) {
          results.push({
            productId: product.externalId,
            wooProductId: 0,
            previousStock: 0,
            newStock: stockInfo.quantity,
            synced: false,
            error: 'WooCommerce product not found',
          });
          continue;
        }

        const previousStock = wooProduct.stock_quantity || 0;

        if (!stockInfo.inStock) {
          outOfStock++;
          // Disable product in WooCommerce if out of stock
          await this.wooCommerce.disableProduct(wooProduct.id);
          results.push({
            productId: product.externalId,
            wooProductId: wooProduct.id,
            previousStock,
            newStock: 0,
            synced: true,
          });
        } else {
          // Update stock in WooCommerce
          await this.wooCommerce.updateProductStock(wooProduct.id, stockInfo.quantity);
          results.push({
            productId: product.externalId,
            wooProductId: wooProduct.id,
            previousStock,
            newStock: stockInfo.quantity,
            synced: true,
          });
        }

        // Rate limiting
        await this.delay(300);
      } catch (error) {
        results.push({
          productId: product.externalId,
          wooProductId: 0,
          previousStock: 0,
          newStock: 0,
          synced: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      total: results.length,
      synced: results.filter(r => r.synced).length,
      failed: results.filter(r => !r.synced).length,
      outOfStock,
      results,
    };
  }

  /**
   * Sync single product inventory
   */
  async syncProductInventory(cjProductId: string, wooProductId: number): Promise<StockSyncResult> {
    try {
      const stockInfo = await this.cjDropshipping.checkStock(cjProductId);
      const wooProduct = await this.wooCommerce.getProduct(wooProductId);

      if (!wooProduct) {
        return {
          productId: cjProductId,
          wooProductId,
          previousStock: 0,
          newStock: 0,
          synced: false,
          error: 'WooCommerce product not found',
        };
      }

      const previousStock = wooProduct.stock_quantity || 0;

      if (!stockInfo.inStock) {
        await this.wooCommerce.disableProduct(wooProductId);
        return {
          productId: cjProductId,
          wooProductId,
          previousStock,
          newStock: 0,
          synced: true,
        };
      }

      await this.wooCommerce.updateProductStock(wooProductId, stockInfo.quantity);
      return {
        productId: cjProductId,
        wooProductId,
        previousStock,
        newStock: stockInfo.quantity,
        synced: true,
      };
    } catch (error) {
      return {
        productId: cjProductId,
        wooProductId,
        previousStock: 0,
        newStock: 0,
        synced: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(threshold: number = 5): Promise<
    Array<{
      id: string;
      title: string;
      currentStock: number;
    }>
  > {
    const wooProducts = await this.wooCommerce.getProducts({ per_page: 100 });

    return wooProducts
      .filter(p => p.stock_quantity !== null && p.stock_quantity <= threshold)
      .map(p => ({
        id: p.sku,
        title: p.name,
        currentStock: p.stock_quantity || 0,
      }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
