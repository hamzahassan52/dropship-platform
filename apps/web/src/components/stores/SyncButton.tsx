'use client';

import { useState } from 'react';

interface SyncButtonProps {
  storeId: string;
  onSync: (storeId: string, type?: 'full' | 'orders' | 'products') => Promise<void>;
  size?: 'sm' | 'md';
}

export default function SyncButton({ storeId, onSync, size = 'md' }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleSync = async (type: 'full' | 'orders' | 'products' = 'full') => {
    setIsSyncing(true);
    setShowOptions(false);
    try {
      await onSync(storeId, type);
    } finally {
      setIsSyncing(false);
    }
  };

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-sm'
    : 'px-4 py-2';

  return (
    <div className="relative">
      <div className="flex">
        <button
          onClick={() => handleSync('full')}
          disabled={isSyncing}
          className={`${sizeClasses} font-medium text-white bg-indigo-600 rounded-l-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors`}
        >
          {isSyncing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync
            </>
          )}
        </button>
        <button
          onClick={() => setShowOptions(!showOptions)}
          disabled={isSyncing}
          className={`${size === 'sm' ? 'px-2' : 'px-3'} text-white bg-indigo-600 border-l border-indigo-500 rounded-r-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {showOptions && (
        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
          <button
            onClick={() => handleSync('full')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Full Sync
          </button>
          <button
            onClick={() => handleSync('orders')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Orders Only
          </button>
          <button
            onClick={() => handleSync('products')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Products Only
          </button>
        </div>
      )}
    </div>
  );
}
