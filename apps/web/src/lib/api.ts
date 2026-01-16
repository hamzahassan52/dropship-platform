// Server-side API calls to NestJS backend
import {
  mockDashboardStats,
  mockOrderStats,
  mockOrders,
  mockSalesData,
  mockStoreStats,
  mockStores,
} from './mock-data';

// Use the correct env variable and add /api prefix for NestJS backend
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';
// Set USE_MOCK to false to use real backend - check env variable properly
const USE_MOCK = process.env.USE_MOCK === 'true';

export interface Store {
  id: string;
  name: string;
  platform: 'WOOCOMMERCE' | 'SHOPIFY';
  storeUrl: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  orderCount?: number;
  productCount?: number;
  settings?: {
    autoFulfill?: boolean;
    autoSyncTracking?: boolean;
    autoSyncInventory?: boolean;
  };
}

export interface Product {
  id: string;
  storeId: string;
  externalProductId: string;
  name: string;
  sku?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface WebhookStatus {
  active: string[];
  missing: string[];
}

export interface StoreStats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  fulfilledOrders: number;
  fulfillmentRate: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  totalProfit: number;
  profitMargin: number;
  activeProducts: number;
  lowStockProducts: number;
}

export interface Order {
  id: string;
  externalOrderId?: string;
  storeId: string;
  store?: Store;
  customerEmail: string;
  status: string;
  total: number;
  profit?: number;
  createdAt: string;
  trackingNumber?: string;
}

export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  profit: number;
}

// Dashboard APIs
export async function getDashboardStats(): Promise<DashboardStats> {
  if (USE_MOCK) return mockDashboardStats;

  try {
    const res = await fetch(`${API_BASE}/dashboard`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  } catch {
    return mockDashboardStats;
  }
}

export async function getSalesChart(days = 7): Promise<SalesData[]> {
  if (USE_MOCK) return mockSalesData;

  try {
    const res = await fetch(`${API_BASE}/dashboard/sales-chart?days=${days}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error('Failed to fetch sales chart');
    return res.json();
  } catch {
    return mockSalesData;
  }
}

// Stores APIs
export async function getStores(): Promise<Store[]> {
  if (USE_MOCK) return mockStores;

  try {
    const res = await fetch(`${API_BASE}/stores`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error('Failed to fetch stores');
    return res.json();
  } catch {
    return mockStores;
  }
}

export async function getStoreById(storeId: string): Promise<Store> {
  if (USE_MOCK) {
    const store = mockStores.find(s => s.id === storeId);
    if (!store) throw new Error('Store not found');
    return store;
  }

  try {
    const res = await fetch(`${API_BASE}/stores/${storeId}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error('Failed to fetch store');
    return res.json();
  } catch {
    const store = mockStores.find(s => s.id === storeId);
    if (!store) throw new Error('Store not found');
    return store;
  }
}

export async function getStoreStats(storeId: string): Promise<StoreStats> {
  if (USE_MOCK) {
    return mockStoreStats[storeId] || mockStoreStats['store-1'];
  }

  try {
    const res = await fetch(`${API_BASE}/stores/${storeId}/stats`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error('Failed to fetch store stats');
    return res.json();
  } catch {
    return mockStoreStats[storeId] || mockStoreStats['store-1'];
  }
}

// Orders APIs
export async function getPendingOrders(): Promise<Order[]> {
  if (USE_MOCK) return mockOrders;

  try {
    const res = await fetch(`${API_BASE}/orders/pending`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error('Failed to fetch pending orders');
    return res.json();
  } catch {
    return mockOrders;
  }
}

export async function getOrderStats() {
  if (USE_MOCK) return mockOrderStats;

  try {
    const res = await fetch(`${API_BASE}/orders/stats`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error('Failed to fetch order stats');
    return res.json();
  } catch {
    return mockOrderStats;
  }
}

// Store Orders
export async function getStoreOrders(storeId: string): Promise<Order[]> {
  try {
    const res = await fetch(`${API_BASE}/orders?storeId=${storeId}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error('Failed to fetch store orders');
    return res.json();
  } catch {
    return [];
  }
}

// Store Products
export async function getStoreProducts(storeId: string): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE}/stores/${storeId}/products`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error('Failed to fetch store products');
    return res.json();
  } catch {
    return [];
  }
}

// Webhook Status
export async function getWebhookStatus(storeId: string): Promise<WebhookStatus> {
  try {
    const res = await fetch(`${API_BASE}/stores/${storeId}/webhooks`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error('Failed to fetch webhook status');
    return res.json();
  } catch {
    return { active: [], missing: [] };
  }
}

// Sync Store (client-side)
export async function syncStore(storeId: string, type: 'full' | 'orders' | 'products' = 'full') {
  const endpoint = type === 'full'
    ? `${API_BASE}/stores/${storeId}/sync`
    : `${API_BASE}/stores/${storeId}/sync/${type}`;

  const res = await fetch(endpoint, { method: 'POST' });
  if (!res.ok) throw new Error('Sync failed');
  return res.json();
}

// Repair Webhooks
export async function repairWebhooks(storeId: string) {
  const res = await fetch(`${API_BASE}/stores/${storeId}/webhooks/repair`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to repair webhooks');
  return res.json();
}

// Failed Orders
export async function getFailedOrders(): Promise<Order[]> {
  try {
    const res = await fetch(`${API_BASE}/orders/failed`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error('Failed to fetch failed orders');
    return res.json();
  } catch {
    return [];
  }
}

// Retry Order
export async function retryOrder(orderId: string) {
  const res = await fetch(`${API_BASE}/orders/${orderId}/retry`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to retry order');
  return res.json();
}
