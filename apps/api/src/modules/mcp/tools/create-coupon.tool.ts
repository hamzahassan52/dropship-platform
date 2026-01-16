import { Injectable } from '@nestjs/common';
import { WooCommerceService } from '../../../integrations/woocommerce/woocommerce.service';

@Injectable()
export class CreateCouponTool {
  constructor(private readonly wooCommerce: WooCommerceService) {}

  getToolDefinition() {
    return {
      name: 'create_coupon',
      description: 'Create a discount coupon/code for your store. Can create percentage or fixed amount discounts.',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Coupon code (e.g., SAVE10, SUMMER2024). Will be auto-generated if not provided.',
          },
          discountType: {
            type: 'string',
            enum: ['percent', 'fixed_cart', 'fixed_product'],
            description: 'Type of discount. percent=percentage off, fixed_cart=fixed amount off cart, fixed_product=fixed amount off each product.',
          },
          amount: {
            type: 'number',
            description: 'Discount amount (percentage or fixed value).',
          },
          description: {
            type: 'string',
            description: 'Internal description for the coupon.',
          },
          expiryDate: {
            type: 'string',
            description: 'Expiry date in YYYY-MM-DD format.',
          },
          usageLimit: {
            type: 'number',
            description: 'Maximum number of times this coupon can be used.',
          },
          usageLimitPerUser: {
            type: 'number',
            description: 'Maximum times a single customer can use this coupon.',
          },
          minimumAmount: {
            type: 'number',
            description: 'Minimum cart amount required to use coupon.',
          },
          maximumAmount: {
            type: 'number',
            description: 'Maximum cart amount allowed for coupon.',
          },
          freeShipping: {
            type: 'boolean',
            description: 'If true, coupon grants free shipping.',
          },
          productIds: {
            type: 'array',
            items: { type: 'number' },
            description: 'Product IDs this coupon applies to.',
          },
          excludedProductIds: {
            type: 'array',
            items: { type: 'number' },
            description: 'Product IDs excluded from this coupon.',
          },
        },
        required: ['discountType', 'amount'],
      },
    };
  }

  async execute(params: {
    code?: string;
    discountType: 'percent' | 'fixed_cart' | 'fixed_product';
    amount: number;
    description?: string;
    expiryDate?: string;
    usageLimit?: number;
    usageLimitPerUser?: number;
    minimumAmount?: number;
    maximumAmount?: number;
    freeShipping?: boolean;
    productIds?: number[];
    excludedProductIds?: number[];
  }) {
    try {
      // Generate code if not provided
      const code = params.code || this.generateCouponCode();

      const couponData: any = {
        code,
        discount_type: params.discountType,
        amount: String(params.amount),
        description: params.description || `${params.amount}${params.discountType === 'percent' ? '%' : '$'} off`,
        individual_use: true,
      };

      if (params.expiryDate) {
        couponData.date_expires = params.expiryDate;
      }
      if (params.usageLimit) {
        couponData.usage_limit = params.usageLimit;
      }
      if (params.usageLimitPerUser) {
        couponData.usage_limit_per_user = params.usageLimitPerUser;
      }
      if (params.minimumAmount) {
        couponData.minimum_amount = String(params.minimumAmount);
      }
      if (params.maximumAmount) {
        couponData.maximum_amount = String(params.maximumAmount);
      }
      if (params.freeShipping) {
        couponData.free_shipping = true;
      }
      if (params.productIds?.length) {
        couponData.product_ids = params.productIds;
      }
      if (params.excludedProductIds?.length) {
        couponData.excluded_product_ids = params.excludedProductIds;
      }

      const coupon = await this.wooCommerce.createCoupon(couponData);

      return {
        success: true,
        message: `Coupon "${code}" created successfully`,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discount_type,
          amount: coupon.amount,
          expiryDate: coupon.date_expires,
          usageLimit: coupon.usage_limit,
          usageCount: coupon.usage_count,
          freeShipping: coupon.free_shipping,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create coupon',
      };
    }
  }

  private generateCouponCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
