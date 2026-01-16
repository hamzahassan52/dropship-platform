import { Injectable } from '@nestjs/common';
import { WooCommerceService } from '../../../integrations/woocommerce/woocommerce.service';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class GetProductsTool {
  constructor(
    private readonly wooCommerce: WooCommerceService,
    private readonly prisma: PrismaService,
  ) {}

  getToolDefinition() {
    return {
      name: 'get_products',
      description: 'Get products from your WooCommerce/Shopify store. Can filter by status, category, or search term.',
      inputSchema: {
        type: 'object',
        properties: {
          storeId: {
            type: 'string',
            description: 'Store ID to get products from. If not provided, uses default store.',
          },
          status: {
            type: 'string',
            enum: ['publish', 'draft', 'pending', 'private', 'any'],
            description: 'Filter by product status. Default is "publish".',
          },
          search: {
            type: 'string',
            description: 'Search products by name or SKU.',
          },
          category: {
            type: 'string',
            description: 'Filter by category ID or name.',
          },
          limit: {
            type: 'number',
            description: 'Maximum products to return. Default 20, max 100.',
          },
          page: {
            type: 'number',
            description: 'Page number for pagination. Default 1.',
          },
        },
      },
    };
  }

  async execute(params: {
    storeId?: string;
    status?: string;
    search?: string;
    category?: string;
    limit?: number;
    page?: number;
  }) {
    try {
      const limit = Math.min(params.limit || 20, 100);
      const page = params.page || 1;

      const products = await this.wooCommerce.getProducts({
        status: params.status || 'publish',
        search: params.search,
        category: params.category,
        per_page: limit,
        page,
      });

      return {
        success: true,
        count: products.length,
        page,
        limit,
        products: products.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          regularPrice: p.regular_price,
          salePrice: p.sale_price,
          stock: p.stock_quantity,
          status: p.status,
          categories: p.categories?.map((c: any) => c.name) || [],
          image: p.images?.[0]?.src || null,
        })),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch products',
      };
    }
  }
}
