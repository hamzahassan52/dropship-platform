import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  CheckCircle,
  RefreshCw,
  Settings,
  ExternalLink,
  Package
} from 'lucide-react';
import { getStoreById, getStoreStats } from '@/lib/api';
import { StoreDetailCharts } from './StoreDetailCharts';
import { StoreDetailTabs } from './StoreDetailTabs';

interface PageProps {
  params: { storeId: string };
}

export const dynamic = 'force-dynamic';

export default async function StoreDetailPage({ params }: PageProps) {
  let store = null;
  let stats = null;

  try {
    [store, stats] = await Promise.all([
      getStoreById(params.storeId),
      getStoreStats(params.storeId),
    ]);
  } catch (error) {
    console.error('Failed to fetch store:', error);
  }

  if (!store) {
    notFound();
  }

  return (
    <div>
      {/* Back Button */}
      <Link href="/stores" className="back-btn">
        <ArrowLeft size={20} />
        Back to Stores
      </Link>

      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h1 className="page-title">{store.name}</h1>
            <span className={`store-badge ${store.platform.toLowerCase()}`}>
              {store.platform}
            </span>
            <span className={`status-badge ${store.isActive ? 'active' : 'inactive'}`}>
              {store.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div style={{ color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {store.storeUrl}
            <a
              href={`https://${store.storeUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--primary)' }}
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary">
            <RefreshCw size={16} />
            Sync Now
          </button>
          <button className="btn btn-secondary">
            <Settings size={16} />
            Settings
          </button>
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
          <div className="stat-icon green">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>Fulfillment Rate</h3>
            <div className="stat-value">
              {stats?.fulfillmentRate?.toFixed(1) || '0'}%
            </div>
            <div className="stat-change positive">
              {stats?.fulfilledOrders || 0} fulfilled
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <StoreDetailCharts />

      {/* Profit Breakdown */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h2 className="card-title">Profit Margin Analysis</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#166534', marginBottom: '0.25rem' }}>
              Gross Profit
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>
              ${((stats?.totalProfit || 0) * 1.2).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '0.25rem' }}>
              Platform Fees
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#92400e' }}>
              -${((stats?.totalRevenue || 0) * 0.029).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.25rem' }}>
              Shipping Costs
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#991b1b' }}>
              -${((stats?.totalOrders || 0) * 3.5).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.25rem' }}>
              Net Profit
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>
              ${stats?.totalProfit?.toFixed(2) || '0'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <StoreDetailTabs storeId={params.storeId} stats={stats} />

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary">
            <Package size={16} />
            Fulfill Pending Orders ({stats?.pendingOrders || 0})
          </button>
          <button className="btn btn-secondary">
            <RefreshCw size={16} />
            Sync Inventory
          </button>
        </div>
      </div>
    </div>
  );
}
