import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CjDropshippingService } from '../../integrations/cj-dropshipping/cj-dropshipping.service';

@Module({
  providers: [ProductsService, CjDropshippingService],
  controllers: [ProductsController],
  exports: [ProductsService, CjDropshippingService],
})
export class ProductsModule {}
