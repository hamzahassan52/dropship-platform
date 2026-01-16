import { Injectable } from '@nestjs/common';
import { CjDropshippingService } from '../../../integrations/cj-dropshipping/cj-dropshipping.service';

@Injectable()
export class GetShippingRatesTool {
  constructor(private readonly cjService: CjDropshippingService) {}

  getToolDefinition() {
    return {
      name: 'get_shipping_rates',
      description: 'Get shipping rates from CJ Dropshipping for a product to a specific country.',
      inputSchema: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'CJ Product ID or variant ID.',
          },
          country: {
            type: 'string',
            description: 'Destination country code (e.g., US, UK, CA, AU).',
          },
          quantity: {
            type: 'number',
            description: 'Quantity to ship. Default: 1',
          },
          province: {
            type: 'string',
            description: 'State/Province (optional, for more accurate rates).',
          },
        },
        required: ['productId', 'country'],
      },
    };
  }

  async execute(params: {
    productId: string;
    country: string;
    quantity?: number;
    province?: string;
  }) {
    try {
      const quantity = params.quantity || 1;

      const rates = await this.cjService.getShippingRates(
        params.productId,
        params.country,
        quantity,
        params.province,
      );

      if (!rates || rates.length === 0) {
        return {
          success: true,
          message: 'No shipping options available for this destination.',
          rates: [],
        };
      }

      return {
        success: true,
        productId: params.productId,
        destination: {
          country: params.country,
          province: params.province || 'N/A',
        },
        quantity,
        rates: rates.map((r: any) => ({
          method: r.logisticName || r.name,
          price: r.logisticPrice || r.price,
          currency: 'USD',
          estimatedDays: r.logisticAging || r.aging || 'N/A',
          trackable: r.trackable ?? true,
        })),
        cheapest: rates.reduce((min: any, r: any) => {
          const price = r.logisticPrice || r.price || 999;
          return price < (min.price || 999) ? { method: r.logisticName || r.name, price } : min;
        }, { price: 999 }),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch shipping rates',
      };
    }
  }
}
