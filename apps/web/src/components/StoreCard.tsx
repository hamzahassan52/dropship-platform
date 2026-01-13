import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Store } from '@/lib/api';
import { mockStoreStats } from '@/lib/mock-data';

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  const stats = mockStoreStats[store.id] || mockStoreStats['store-1'];

  return (
    <Link
      href={`/stores/${store.id}`}
      className={`store-card ${store.platform.toLowerCase()}`}
    >
      <div className="store-header">
        <div className="store-info">
          <h3>{store.name}</h3>
          <div className="store-url">
            {store.storeUrl}
            <ExternalLink size={12} style={{ marginLeft: '0.25rem', opacity: 0.5 }} />
          </div>
        </div>
        <span className={`store-badge ${store.platform.toLowerCase()}`}>
          {store.platform}
        </span>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <span className={`status-badge ${store.isActive ? 'active' : 'inactive'}`}>
          {store.isActive ? 'Active' : 'Inactive'}
        </span>
        {store.lastSyncAt && (
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginLeft: '0.5rem' }}>
            Synced {new Date(store.lastSyncAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="store-stats">
        <div className="store-stat">
          <div className="store-stat-value">{stats.totalOrders}</div>
          <div className="store-stat-label">Orders</div>
        </div>
        <div className="store-stat">
          <div className="store-stat-value">${(stats.totalRevenue / 1000).toFixed(1)}k</div>
          <div className="store-stat-label">Revenue</div>
        </div>
        <div className="store-stat">
          <div className="store-stat-value" style={{ color: 'var(--success)' }}>
            ${(stats.totalProfit / 1000).toFixed(1)}k
          </div>
          <div className="store-stat-label">Profit</div>
        </div>
      </div>
    </Link>
  );
}
