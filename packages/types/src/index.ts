// Product Types
export interface Product {
  id: string;
  externalId: string;
  source: 'CJ_DROPSHIPPING' | 'ALIEXPRESS';
  title: string;
  description?: string;
  images: string[];
  supplierPrice: number;
  shippingCost: number;
  category?: string;
  supplierId: string;
  rating?: number;
  orderCount: number;
  createdAt: Date;
}

export interface ProductSearchParams {
  query: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  category?: string;
  limit?: number;
  page?: number;
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

// Supplier Types
export interface Supplier {
  id: string;
  externalId: string;
  source: 'CJ_DROPSHIPPING' | 'ALIEXPRESS';
  name: string;
  rating?: number;
  responseRate?: number;
  shipOnTime?: number;
  disputeRate?: number;
  trustScore?: number;
}

// Order Types
export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: string;
  userId: string;
  storeId: string;
  customerEmail: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  profit: number;
  status: OrderStatus;
  supplierOrderId?: string;
  trackingNumber?: string;
  createdAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  supplierPrice: number;
  supplierProductId: string;
}

export interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

// User Types
export type UserPlan = 'FREE' | 'PRO' | 'AGENCY' | 'ENTERPRISE';

export interface User {
  id: string;
  email: string;
  apiKey: string;
  plan: UserPlan;
  createdAt: Date;
}

// Store Types
export type StorePlatform = 'SHOPIFY' | 'WOOCOMMERCE' | 'EBAY' | 'CUSTOM';

export interface Store {
  id: string;
  userId: string;
  name: string;
  platform: StorePlatform;
  storeUrl?: string;
  createdAt: Date;
}

// MCP Tool Types
export interface MCPToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Profit Calculation
export interface ProfitCalculation {
  supplierPrice: number;
  shippingCost: number;
  platformFees: number;
  totalCost: number;
  sellingPrice: number;
  profit: number;
  profitMargin: number;
}
