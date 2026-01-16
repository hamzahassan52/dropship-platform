import { Injectable } from '@nestjs/common';
import { WooCommerceService } from '../../../integrations/woocommerce/woocommerce.service';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class GetCustomersTool {
  constructor(
    private readonly wooCommerce: WooCommerceService,
    private readonly prisma: PrismaService,
  ) {}

  getToolDefinition() {
    return {
      name: 'get_customers',
      description: 'Get customer list from your store. Can filter by email, name, or get top customers by orders.',
      inputSchema: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'Search customers by name or email.',
          },
          email: {
            type: 'string',
            description: 'Get specific customer by email.',
          },
          orderBy: {
            type: 'string',
            enum: ['registered_date', 'id', 'include', 'name', 'email'],
            description: 'Order results by field. Default: registered_date',
          },
          order: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: 'Order direction. Default: desc',
          },
          limit: {
            type: 'number',
            description: 'Maximum customers to return. Default 20.',
          },
          topBuyers: {
            type: 'boolean',
            description: 'If true, returns top customers by total orders.',
          },
        },
      },
    };
  }

  async execute(params: {
    search?: string;
    email?: string;
    orderBy?: string;
    order?: string;
    limit?: number;
    topBuyers?: boolean;
  }) {
    try {
      const limit = params.limit || 20;

      // If topBuyers requested, get from our database
      if (params.topBuyers) {
        const topCustomers = await this.prisma.order.groupBy({
          by: ['customerEmail'],
          _count: { id: true },
          _sum: { total: true },
          orderBy: { _count: { id: 'desc' } },
          take: limit,
        });

        return {
          success: true,
          count: topCustomers.length,
          customers: topCustomers.map((c, i) => ({
            rank: i + 1,
            email: c.customerEmail,
            totalOrders: c._count.id,
            totalSpent: c._sum.total || 0,
          })),
        };
      }

      // Get from WooCommerce
      const customers = await this.wooCommerce.getCustomers({
        search: params.search,
        email: params.email,
        orderby: params.orderBy || 'registered_date',
        order: params.order || 'desc',
        per_page: limit,
      });

      return {
        success: true,
        count: customers.length,
        customers: customers.map((c: any) => ({
          id: c.id,
          email: c.email,
          firstName: c.first_name,
          lastName: c.last_name,
          name: `${c.first_name} ${c.last_name}`.trim(),
          ordersCount: c.orders_count || 0,
          totalSpent: c.total_spent || '0',
          registered: c.date_created,
          country: c.billing?.country || c.shipping?.country,
          city: c.billing?.city || c.shipping?.city,
        })),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch customers',
      };
    }
  }
}
