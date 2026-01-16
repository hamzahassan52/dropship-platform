'use client';

import { useState } from 'react';
import Link from 'next/link';

interface StoreCardProps {
  store: {
    id: string;
    name: string;
    platform: 'WOOCOMMERCE' | 'SHOPIFY';
    storeUrl: string;
    isActive: boolean;
    lastSyncAt?: string | null;
    orderCount?: number;
    productCount?: number;
  };
  onSync?: (storeId: string) => Promise<void>;
  onDelete?: (storeId: string) => Promise<void>;
}

const platformIcons: Record<string, string> = {
  WOOCOMMERCE: 'W',
  SHOPIFY: 'S',
};

const platformColors: Record<string, string> = {
  WOOCOMMERCE: 'bg-purple-600',
  SHOPIFY: 'bg-green-600',
};

export default function StoreCard({ store, onSync, onDelete }: StoreCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSync = async () => {
    if (!onSync) return;
    setIsSyncing(true);
    try {
      await onSync(store.id);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm(`Delete "${store.name}"?`)) return;
    setIsDeleting(true);
    try {
      await onDelete(store.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Platform Icon */}
            <div className={`w-10 h-10 ${platformColors[store.platform]} rounded-lg flex items-center justify-center text-white font-bold`}>
              {platformIcons[store.platform]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{store.name}</h3>
              <p className="text-sm text-gray-500">{store.platform}</p>
            </div>
          </div>
          {/* Status Badge */}
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
            store.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {store.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">{store.orderCount || 0}</p>
          <p className="text-sm text-gray-500">Orders</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{store.productCount || 0}</p>
          <p className="text-sm text-gray-500">Products</p>
        </div>
      </div>

      {/* Last Sync */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Last sync: {formatDate(store.lastSyncAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-100 flex gap-2">
        <Link
          href={`/stores/${store.id}`}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-center transition-colors"
        >
          View
        </Link>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isSyncing ? 'Syncing...' : 'Sync'}
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          {isDeleting ? '...' : 'X'}
        </button>
      </div>
    </div>
  );
}
