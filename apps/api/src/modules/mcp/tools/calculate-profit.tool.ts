import { Injectable } from '@nestjs/common';
import { CjDropshippingService } from '../../../integrations/cj-dropshipping/cj-dropshipping.service';

@Injectable()
export class CalculateProfitTool {
  constructor(private readonly cjDropshipping: CjDropshippingService) {}

  getToolDefinition() {
    return {
      name: 'calculate_profit',
      description: 'Calculate profit margins for a product. Provides detailed breakdown including supplier cost, shipping, fees, and net profit.',
      inputSchema: {
        type: 'object',
        properties: {
          cjProductId: {
            type: 'string',
            description: 'CJ Dropshipping product ID to calculate profit for.',
          },
          sellingPrice: {
            type: 'number',
            description: 'Your intended selling price.',
          },
          quantity: {
            type: 'number',
            description: 'Number of units (default: 1).',
          },
          country: {
            type: 'string',
            description: 'Destination country code for shipping calculation (default: US).',
          },
          platformFee: {
            type: 'number',
            description: 'Platform fee percentage (default: 3% for payment processing).',
          },
        },
        required: ['cjProductId', 'sellingPrice'],
      },
    };
  }

  async execute(params: {
    cjProductId: string;
    sellingPrice: number;
    quantity?: number;
    country?: string;
    platformFee?: number;
  }) {
    const quantity = params.quantity || 1;
    const country = params.country || 'US';
    const platformFeePercent = params.platformFee || 3;

    // Get product details
    const product = await this.cjDropshipping.getProductDetails(params.cjProductId);
    if (!product) {
      return {
        success: false,
        error: 'Product not found',
      };
    }

    // Calculate shipping cost
    const shippingCost = await this.cjDropshipping.calculateShipping(
      params.cjProductId,
      quantity,
      country,
    );

    // Calculations
    const supplierCost = product.supplierPrice * quantity;
    const totalShipping = shippingCost;
    const totalCost = supplierCost + totalShipping;

    const revenue = params.sellingPrice * quantity;
    const platformFee = (revenue * platformFeePercent) / 100;
    const grossProfit = revenue - totalCost;
    const netProfit = grossProfit - platformFee;
    const profitMargin = (netProfit / revenue) * 100;
    const roi = (netProfit / totalCost) * 100;

    // Recommendations
    const recommendations: string[] = [];
    if (profitMargin < 20) {
      recommendations.push('Low margin: Consider increasing price or finding cheaper supplier');
    }
    if (profitMargin >= 30 && profitMargin < 50) {
      recommendations.push('Good margin: Healthy profit for dropshipping');
    }
    if (profitMargin >= 50) {
      recommendations.push('Excellent margin: Great profit potential');
    }
    if (shippingCost > supplierCost * 0.5) {
      recommendations.push('High shipping cost: Consider products with better shipping rates');
    }

    // Suggested pricing
    const suggested = {
      minimum: Math.ceil((totalCost / (1 - 0.25)) * 1.1), // 25% margin minimum
      recommended: Math.ceil((totalCost / (1 - 0.35)) * 1.1), // 35% margin
      premium: Math.ceil((totalCost / (1 - 0.50)) * 1.1), // 50% margin
    };

    return {
      success: true,
      product: {
        id: product.id,
        title: product.title,
      },
      breakdown: {
        supplierCost: parseFloat(supplierCost.toFixed(2)),
        shippingCost: parseFloat(totalShipping.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        revenue: parseFloat(revenue.toFixed(2)),
        platformFee: parseFloat(platformFee.toFixed(2)),
        grossProfit: parseFloat(grossProfit.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
      },
      metrics: {
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        roi: parseFloat(roi.toFixed(2)),
      },
      suggestedPricing: suggested,
      recommendations,
      quantity,
      country,
    };
  }
}
