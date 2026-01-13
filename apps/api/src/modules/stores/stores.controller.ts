import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { StoresService, CreateStoreDto, UpdateStoreDto } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  // For now, using a default user ID. In production, get from auth token
  private getUserId(): string {
    return 'default-user';
  }

  @Post()
  async addStore(@Body() data: CreateStoreDto) {
    return this.storesService.addStore(this.getUserId(), data);
  }

  @Get()
  async getStores() {
    return this.storesService.getStores(this.getUserId());
  }

  @Get(':storeId')
  async getStore(@Param('storeId') storeId: string) {
    return this.storesService.getStore(this.getUserId(), storeId);
  }

  @Put(':storeId')
  async updateStore(
    @Param('storeId') storeId: string,
    @Body() data: UpdateStoreDto,
  ) {
    return this.storesService.updateStore(this.getUserId(), storeId, data);
  }

  @Delete(':storeId')
  async removeStore(@Param('storeId') storeId: string) {
    return this.storesService.removeStore(this.getUserId(), storeId);
  }

  @Post(':storeId/toggle')
  async toggleStatus(@Param('storeId') storeId: string) {
    return this.storesService.toggleStoreStatus(this.getUserId(), storeId);
  }

  @Get(':storeId/stats')
  async getStoreStats(@Param('storeId') storeId: string) {
    return this.storesService.getStoreStats(this.getUserId(), storeId);
  }
}
