import Link from 'next/link';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Store as StoreIcon,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { getDashboardStats, getSalesChart, getStores } from '@/lib/api';
import { SalesChart } from '@/components/SalesChart';
import { StoreCard } from '@/components/StoreCard';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  let stats: Awaited<ReturnType<typeof getDashboardStats>> | null = null;
  let salesData: Awaited<ReturnType<typeof getSalesChart>> = [];
  let stores: Awaited<ReturnType<typeof getStores>> = [];

  try {
    [stats, salesData, stores] = await Promise.all([
      getDashboardStats(),
      getSalesChart(7),
      getStores(),
    ]);
  } catch (error) {
    // API not available - show demo data
    console.error('API Error:', error);
  }

  const activeStores = stores.filter((s) => s.isActive).length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary">
            <Clock size={16} />
            Last 7 Days
          </button>
          <Link href="/stores" className="btn btn-primary">
            <StoreIcon size={16} />
            Manage Stores
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Revenue</h3>
            <div className="stat-value">
              ${stats?.totalRevenue?.toLocaleString() || '0'}
            </div>
            <div className="stat-change positive">+12.5% from last week</div>
          </div>
        </div>

        <div className="stat-card profit-card">
          <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <TrendingUp size={24} color="white" />
          </div>
          <div className="stat-content">
            <h3>Total Profit</h3>
            <div className="stat-value">
              ${stats?.totalProfit?.toLocaleString() || '0'}
            </div>
            <div className="stat-change" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {stats?.profitMargin?.toFixed(1) || '0'}% margin
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon yellow">
            <ShoppingCart size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Orders</h3>
            <div className="stat-value">{stats?.totalOrders || 0}</div>
            <div className="stat-change">
              {stats?.pendingOrders || 0} pending
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <StoreIcon size={24} />
          </div>
          <div className="stat-content">
            <h3>Active Stores</h3>
            <div className="stat-value">{activeStores}/{stores.length}</div>
            <div className="stat-change">Connected</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Revenue & Profit Trend</h2>
          </div>
          <SalesChart data={salesData} />
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Quick Stats</h2>
          </div>
          <div style={{ padding: '1rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--gray-200)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} color="var(--success)" />
                Fulfillment Rate
              </span>
              <strong>98.5%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--gray-200)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={18} color="var(--primary)" />
                Products Synced
              </span>
              <strong>{stats?.activeProducts || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--gray-200)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} color="var(--warning)" />
                Low Stock Alerts
              </span>
              <strong>{stats?.lowStockProducts || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="var(--gray-500)" />
                Avg Processing Time
              </span>
              <strong>2.4 hrs</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Stores Quick View */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Your Stores</h2>
          <Link href="/stores" className="btn btn-secondary btn-sm">
            View All
          </Link>
        </div>

        {stores.length > 0 ? (
          <div className="stores-grid">
            {stores.slice(0, 4).map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
            <StoreIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No stores connected. Add your first store to get started!</p>
            <Link href="/stores" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              <StoreIcon size={16} />
              Add Store
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
