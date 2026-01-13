import { Suspense } from 'react';
import {
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  Clock
} from 'lucide-react';
import { getPendingOrders, getOrderStats } from '@/lib/api';
import { OrdersList } from './OrdersList';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  let orders: Awaited<ReturnType<typeof getPendingOrders>> = [];
  let stats = { pending: 0, processing: 0, shipped: 0, delivered: 0 };

  try {
    [orders, stats] = await Promise.all([
      getPendingOrders(),
      getOrderStats().catch(() => ({ pending: 0, processing: 0, shipped: 0, delivered: 0 })),
    ]);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Orders</h1>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon yellow">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <h3>Pending</h3>
            <div className="stat-value">{stats.pending || orders.filter(o => o.status === 'PENDING').length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <h3>Processing</h3>
            <div className="stat-value">{stats.processing || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <Truck size={24} />
          </div>
          <div className="stat-content">
            <h3>Shipped</h3>
            <div className="stat-value">{stats.shipped || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Delivered</h3>
            <div className="stat-value">{stats.delivered || 0}</div>
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="loading"><div className="spinner"></div></div>}>
        <OrdersList initialOrders={orders} />
      </Suspense>
    </div>
  );
}
