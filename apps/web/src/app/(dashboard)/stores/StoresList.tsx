'use client';

import Link from 'next/link';
import { Power, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { Store } from '@/lib/api';
import { mockStoreStats } from '@/lib/mock-data';
import { removeStore, toggleStore } from '@/lib/actions';
import { useTransition } from 'react';

interface StoresListProps {
  stores: Store[];
}

export function StoresList({ stores }: StoresListProps) {
  return (
    <div className="stores-grid">
      {stores.map((store) => (
        <StoreItem key={store.id} store={store} />
      ))}
    </div>
  );
}

function StoreItem({ store }: { store: Store }) {
  const [isPending, startTransition] = useTransition();
  const stats = mockStoreStats[store.id] || mockStoreStats['store-1'];

  const handleToggle = () => {
    startTransition(async () => {
      await toggleStore(store.id);
    });
  };

  const handleRemove = () => {
    if (!confirm('Are you sure you want to remove this store?')) return;
    startTransition(async () => {
      await removeStore(store.id);
    });
  };

  return (
    <div className={`store-card ${store.platform.toLowerCase()}`}>
      <div className="store-header">
        <div className="store-info">
          <h3>{store.name}</h3>
          <div className="store-url">
            {store.storeUrl}
            <a
              href={`https://${store.storeUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: '0.5rem', color: 'var(--gray-400)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
            </a>
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
            Last sync: {new Date(store.lastSyncAt).toLocaleDateString()}
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

      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--gray-200)'
      }}>
        <Link
          href={`/stores/${store.id}`}
          className="btn btn-primary btn-sm"
          style={{ flex: 1, justifyContent: 'center' }}
        >
          View Details
        </Link>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleToggle}
          disabled={isPending}
          title={store.isActive ? 'Deactivate' : 'Activate'}
        >
          <Power size={14} />
        </button>
        <button
          className="btn btn-secondary btn-sm"
          title="Sync"
        >
          <RefreshCw size={14} />
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={handleRemove}
          disabled={isPending}
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
