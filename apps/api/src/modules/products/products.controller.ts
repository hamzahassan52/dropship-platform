import { Controller, Get, Query, Param } from '@nestjs/common';
import { ProductsService } from './products.service';
import type { ProductSearchParams } from '@dropship/types';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('search')
  async searchProducts(
    @Query('query') query: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const params: ProductSearchParams = {
      query,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      category,
      limit: limit ? parseInt(limit, 10) : 20,
      page: page ? parseInt(page, 10) : 1,
    };

    return this.productsService.searchProducts(params);
  }

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @Get(':id/profit')
  async calculateProfit(
    @Param('id') id: string,
    @Query('sellingPrice') sellingPrice: string,
    @Query('platformFee') platformFee?: string,
  ) {
    const product = await this.productsService.getProductById(id);
    if (!product) {
      return { error: 'Product not found' };
    }

    return this.productsService.calculateProfit(
      product.supplierPrice,
      product.shippingCost,
      parseFloat(sellingPrice),
      platformFee ? parseFloat(platformFee) : 3,
    );
  }
}
