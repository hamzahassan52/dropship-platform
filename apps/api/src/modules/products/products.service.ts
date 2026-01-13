import { Injectable } from '@nestjs/common';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';
import type { ProductSearchParams, ProductSearchResult, Product } from '@dropship/types';

@Injectable()
export class ProductsService {
  constructor(private readonly cjService: CjDropshippingService) {}

  async searchProducts(params: ProductSearchParams): Promise<ProductSearchResult> {
    // Get products from CJ Dropshipping
    const cjProducts = await this.cjService.searchProducts(params);

    return {
      products: cjProducts,
      total: cjProducts.length,
      page: params.page || 1,
      limit: params.limit || 20,
    };
  }

  async getProductById(id: string): Promise<Product | null> {
    return this.cjService.getProductDetails(id);
  }

  calculateProfit(
    supplierPrice: number,
    shippingCost: number,
    sellingPrice: number,
    platformFeePercent: number = 3,
  ) {
    const platformFees = sellingPrice * (platformFeePercent / 100);
    const totalCost = supplierPrice + shippingCost + platformFees;
    const profit = sellingPrice - totalCost;
    const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

    return {
      supplierPrice,
      shippingCost,
      platformFees,
      totalCost,
      sellingPrice,
      profit,
      profitMargin: Math.round(profitMargin * 100) / 100,
    };
  }
}
