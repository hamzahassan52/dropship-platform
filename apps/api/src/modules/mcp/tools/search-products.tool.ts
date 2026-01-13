import { Injectable } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import type { ProductSearchParams, MCPToolResponse, ProductSearchResult } from '@dropship/types';

@Injectable()
export class SearchProductsTool {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * MCP Tool: search_products
   * Natural language product search across CJ Dropshipping catalog
   */
  async execute(params: Record<string, unknown>): Promise<MCPToolResponse<ProductSearchResult>> {
    try {
      const searchParams: ProductSearchParams = {
        query: String(params.query || ''),
        minPrice: params.minPrice ? Number(params.minPrice) : undefined,
        maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
        minRating: params.minRating ? Number(params.minRating) : undefined,
        category: params.category ? String(params.category) : undefined,
        limit: params.limit ? Number(params.limit) : 20,
        page: params.page ? Number(params.page) : 1,
      };

      if (!searchParams.query) {
        return {
          success: false,
          error: 'Query parameter is required',
        };
      }

      const result = await this.productsService.searchProducts(searchParams);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  getToolDefinition() {
    return {
      name: 'search_products',
      description: 'Search for dropshipping products from CJ Dropshipping. Supports natural language queries like "wireless earbuds under $20" or "trending phone cases".',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query - can be natural language or keywords',
          },
          minPrice: {
            type: 'number',
            description: 'Minimum price filter (USD)',
          },
          maxPrice: {
            type: 'number',
            description: 'Maximum price filter (USD)',
          },
          minRating: {
            type: 'number',
            description: 'Minimum supplier rating (0-5)',
          },
          category: {
            type: 'string',
            description: 'Product category filter',
          },
          limit: {
            type: 'number',
            description: 'Number of results (default: 20, max: 100)',
          },
        },
        required: ['query'],
      },
    };
  }
}
