import { Injectable, Logger } from '@nestjs/common';
import { CjDropshippingService } from '../../../integrations/cj-dropshipping/cj-dropshipping.service';
import { WooCommerceService } from '../../../integrations/woocommerce/woocommerce.service';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class BulkImportProductsTool {
  private readonly logger = new Logger(BulkImportProductsTool.name);

  constructor(
    private readonly cjService: CjDropshippingService,
    private readonly wooCommerce: WooCommerceService,
    private readonly prisma: PrismaService,
  ) {}

  getToolDefinition() {
    return {
      name: 'bulk_import_products',
      description: 'Import multiple products from CJ Dropshipping to your store at once. Can import by category or search term.',
      inputSchema: {
        type: 'object',
        properties: {
          productIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of CJ Product IDs to import.',
          },
          searchQuery: {
            type: 'string',
            description: 'Search CJ catalog and import top results.',
          },
          categoryId: {
            type: 'string',
            description: 'CJ category ID to import products from.',
          },
          limit: {
            type: 'number',
            description: 'Maximum products to import (when using search or category). Default: 10, Max: 50',
          },
          priceMultiplier: {
            type: 'number',
            description: 'Multiply CJ price by this factor to set selling price. Default: 2.0 (100% markup)',
          },
          storeId: {
            type: 'string',
            description: 'Target store ID. Uses default store if not provided.',
          },
          status: {
            type: 'string',
            enum: ['publish', 'draft', 'pending'],
            description: 'Status for imported products. Default: draft',
          },
        },
      },
    };
  }

  async execute(params: {
    productIds?: string[];
    searchQuery?: string;
    categoryId?: string;
    limit?: number;
    priceMultiplier?: number;
    storeId?: string;
    status?: 'publish' | 'draft' | 'pending';
  }) {
    try {
      const limit = Math.min(params.limit || 10, 50);
      const priceMultiplier = params.priceMultiplier || 2.0;
      const status = params.status || 'draft';

      let productIds = params.productIds || [];

      // If search query provided, get products from CJ
      if (params.searchQuery && productIds.length === 0) {
        const searchResults = await this.cjService.searchProducts({ query: params.searchQuery, limit });
        productIds = searchResults.slice(0, limit).map((p: any) => p.pid || p.productId || p.id);
      }

      // If category provided, get products from that category
      if (params.categoryId && productIds.length === 0) {
        const categoryProducts = await this.cjService.getProductsByCategory(params.categoryId, limit);
        productIds = categoryProducts.map((p: any) => p.pid || p.productId);
      }

      if (productIds.length === 0) {
        return {
          success: false,
          error: 'No products to import. Provide productIds, searchQuery, or categoryId.',
        };
      }

      const results: Array<{
        cjProductId: string;
        success: boolean;
        wooProductId?: number;
        name?: string;
        error?: string;
      }> = [];

      for (const cjProductId of productIds) {
        try {
          // Get product details from CJ
          const cjProduct = await this.cjService.getProductDetails(cjProductId);
          if (!cjProduct) {
            results.push({ cjProductId, success: false, error: 'Product not found in CJ' });
            continue;
          }

          // Calculate selling price
          const cj = cjProduct as any;
          const costPrice = parseFloat(cj.sellPrice || cj.price || '0');
          const sellingPrice = (costPrice * priceMultiplier).toFixed(2);

          // Create product in WooCommerce
          const wooProduct = await this.wooCommerce.createProduct({
            name: cj.productNameEn || cj.name,
            type: 'simple',
            regular_price: sellingPrice,
            description: cj.description || '',
            short_description: cj.productNameEn || '',
            sku: `CJ-${cjProductId}`,
            manage_stock: true,
            stock_quantity: 100,
            images: cj.productImage ? [{ src: cj.productImage }] : [],
            meta_data: [
              { key: '_cj_product_id', value: cjProductId },
              { key: '_supplier_price', value: String(costPrice) },
            ],
          });

          // Save product mapping
          if (params.storeId && wooProduct) {
            await this.prisma.productMapping.create({
              data: {
                storeId: params.storeId,
                wooProductId: wooProduct.id,
                wooSku: `CJ-${cjProductId}`,
                cjProductId,
                supplierPrice: costPrice,
              },
            }).catch(() => {
              // Ignore if mapping already exists
            });
          }

          results.push({
            cjProductId,
            success: true,
            wooProductId: wooProduct?.id,
            name: cj.productNameEn || cj.name,
          });

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          results.push({
            cjProductId,
            success: false,
            error: error.message || 'Import failed',
          });
        }
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return {
        success: true,
        summary: {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
          priceMultiplier,
          status,
        },
        imported: successful.map(r => ({
          cjProductId: r.cjProductId,
          wooProductId: r.wooProductId,
          name: r.name,
        })),
        errors: failed.map(r => ({
          cjProductId: r.cjProductId,
          error: r.error,
        })),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Bulk import failed',
      };
    }
  }
}
