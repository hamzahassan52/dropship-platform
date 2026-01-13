// Server-side API calls to NestJS backend
import {
  mockDashboardStats,
  mockOrderStats,
  mockOrders,
  mockSalesData,
  mockStoreStats,
  mockStores,
} from './mock-data';

const API_BASE = process.env.API_URL || 'http://localhost:4000';
const USE_MOCK = process.env.USE_MOCK === 'true' || true; // Enable mock by default for testing

export interface Store {
  id: string;
  name: string;
  platform: 'WOOCOMMERCE' | 'SHOPIFY';
  storeUrl: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
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
