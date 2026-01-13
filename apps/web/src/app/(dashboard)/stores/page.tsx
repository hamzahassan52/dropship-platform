import { Suspense } from 'react';
import { Plus, Store as StoreIcon } from 'lucide-react';
import { getStores } from '@/lib/api';
import { StoresList } from './StoresList';
import { AddStoreButton } from './AddStoreButton';

export const dynamic = 'force-dynamic';

export default async function StoresPage() {
  let stores: Awaited<ReturnType<typeof getStores>> = [];

  try {
    stores = await getStores();
  } catch (error) {
    console.error('Failed to fetch stores:', error);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Stores</h1>
        <AddStoreButton />
      </div>

      <Suspense fallback={<div className="loading"><div className="spinner"></div></div>}>
        {stores.length > 0 ? (
          <StoresList stores={stores} />
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <StoreIcon size={64} style={{ color: 'var(--gray-300)', marginBottom: '1.5rem' }} />
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--gray-700)' }}>
              No Stores Connected
            </h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
              Connect your WooCommerce or Shopify store to start automating your dropshipping business.
            </p>
            <AddStoreButton large />
          </div>
        )}
      </Suspense>
    </div>
  );
}
