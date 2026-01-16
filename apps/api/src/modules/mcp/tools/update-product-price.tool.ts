import { Injectable } from '@nestjs/common';
import { WooCommerceService } from '../../../integrations/woocommerce/woocommerce.service';

@Injectable()
export class UpdateProductPriceTool {
  constructor(private readonly wooCommerce: WooCommerceService) {}

  getToolDefinition() {
    return {
      name: 'update_product_price',
      description: 'Update product price in your store. Can set regular price, sale price, or both.',
      inputSchema: {
        type: 'object',
        properties: {
          productId: {
            type: 'number',
            description: 'Product ID to update.',
          },
          regularPrice: {
            type: 'number',
            description: 'New regular price.',
          },
          salePrice: {
            type: 'number',
            description: 'New sale price (must be less than regular price).',
          },
          sku: {
            type: 'string',
            description: 'Product SKU (alternative to productId).',
          },
        },
        required: ['productId'],
      },
    };
  }

  async execute(params: {
    productId: number;
    regularPrice?: number;
    salePrice?: number;
    sku?: string;
  }) {
    try {
      if (!params.regularPrice && !params.salePrice) {
        return {
          success: false,
          error: 'Provide at least regularPrice or salePrice to update.',
        };
      }

      const updateData: any = {};
      if (params.regularPrice !== undefined) {
        updateData.regular_price = String(params.regularPrice);
      }
      if (params.salePrice !== undefined) {
        updateData.sale_price = String(params.salePrice);
      }

      const updated = await this.wooCommerce.updateProduct(params.productId, updateData);

      return {
        success: true,
        message: `Product price updated successfully`,
        product: {
          id: updated.id,
          name: updated.name,
          sku: updated.sku,
          regularPrice: updated.regular_price,
          salePrice: updated.sale_price,
          price: updated.price,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update product price',
      };
    }
  }
}
