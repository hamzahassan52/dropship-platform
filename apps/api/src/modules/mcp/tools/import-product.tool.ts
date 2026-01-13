import { Injectable } from '@nestjs/common';
import { CjDropshippingService } from '../../../integrations/cj-dropshipping/cj-dropshipping.service';
import { WooCommerceService } from '../../../integrations/woocommerce/woocommerce.service';

@Injectable()
export class ImportProductTool {
  constructor(
    private readonly cjService: CjDropshippingService,
    private readonly wooCommerce: WooCommerceService,
  ) {}

  /**
   * MCP Tool: import_product
   * Import a product from CJ Dropshipping to WooCommerce store
   */
  async execute(params: {
    cjProductId: string;
    sellingPrice: number;
    title?: string;
  }): Promise<{
    success: boolean;
    data?: {
      wooProductId: number;
      title: string;
      price: string;
      costPrice: number;
      profit: number;
      profitMargin: number;
    };
    error?: string;
  }> {
    try {
      // 1. Get product from CJ
      const cjProduct = await this.cjService.getProductDetails(params.cjProductId);
      if (!cjProduct) {
        return { success: false, error: 'Product not found on CJ Dropshipping' };
      }

      // 2. Calculate profit
      const costPrice = cjProduct.supplierPrice + cjProduct.shippingCost;
      const profit = params.sellingPrice - costPrice;
      const profitMargin = (profit / params.sellingPrice) * 100;

      // 3. Create product on WooCommerce
      const wooProduct = await this.wooCommerce.createProduct({
        name: params.title || cjProduct.title,
        regular_price: params.sellingPrice.toFixed(2),
        description: cjProduct.description || '',
        images: cjProduct.images.map(src => ({ src })),
        sku: `CJ-${cjProduct.externalId}`,
        manage_stock: false,
        meta_data: [
          { key: '_cj_product_id', value: cjProduct.externalId },
          { key: '_supplier_price', value: cjProduct.supplierPrice.toString() },
          { key: '_shipping_cost', value: cjProduct.shippingCost.toString() },
        ],
      });

      if (!wooProduct) {
        return { success: false, error: 'Failed to create product on WooCommerce' };
      }

      return {
        success: true,
        data: {
          wooProductId: wooProduct.id,
          title: wooProduct.name,
          price: wooProduct.price,
          costPrice,
          profit,
          profitMargin: Math.round(profitMargin * 100) / 100,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import product',
      };
    }
  }

  getToolDefinition() {
    return {
      name: 'import_product',
      description: 'Import a product from CJ Dropshipping directly to your WooCommerce store. Automatically sets up supplier price tracking for profit calculation.',
      inputSchema: {
        type: 'object',
        properties: {
          cjProductId: {
            type: 'string',
            description: 'CJ Dropshipping product ID',
          },
          sellingPrice: {
            type: 'number',
            description: 'Your selling price (what customers will pay)',
          },
          title: {
            type: 'string',
            description: 'Custom product title (optional, uses CJ title if not provided)',
          },
        },
        required: ['cjProductId', 'sellingPrice'],
      },
    };
  }
}
