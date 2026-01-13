'use client';

import { useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import { addStore } from '@/lib/actions';

interface AddStoreButtonProps {
  large?: boolean;
}

export function AddStoreButton({ large }: AddStoreButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        className={`btn btn-primary ${large ? '' : 'btn-sm'}`}
        onClick={() => setShowModal(true)}
      >
        <Plus size={16} />
        {large ? 'Add Your First Store' : 'Add Store'}
      </button>

      {showModal && <AddStoreModal onClose={() => setShowModal(false)} />}
    </>
  );
}

function AddStoreModal({ onClose }: { onClose: () => void }) {
  const [platform, setPlatform] = useState<'WOOCOMMERCE' | 'SHOPIFY'>('WOOCOMMERCE');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const handleSubmit = async (formData: FormData) => {
    formData.set('platform', platform);
    setError('');

    startTransition(async () => {
      try {
        await addStore(formData);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add store');
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <h2 className="card-title">Add New Store</h2>
          <button onClick={onClose} style={{ fontSize: '1.5rem', lineHeight: 1 }}>
            <X size={20} />
          </button>
        </div>

        <form action={handleSubmit}>
          {/* Platform Selection */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setPlatform('WOOCOMMERCE')}
              style={{
                flex: 1,
                padding: '1rem',
                border: `2px solid ${platform === 'WOOCOMMERCE' ? '#7f54b3' : 'var(--gray-200)'}`,
                borderRadius: '0.5rem',
                background: platform === 'WOOCOMMERCE' ? '#f5f0ff' : 'white',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600, color: '#7f54b3' }}>WooCommerce</div>
            </button>
            <button
              type="button"
              onClick={() => setPlatform('SHOPIFY')}
              style={{
                flex: 1,
                padding: '1rem',
                border: `2px solid ${platform === 'SHOPIFY' ? '#96bf48' : 'var(--gray-200)'}`,
                borderRadius: '0.5rem',
                background: platform === 'SHOPIFY' ? '#f0fff4' : 'white',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600, color: '#96bf48' }}>Shopify</div>
            </button>
          </div>

          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Store Name</label>
            <input
              name="name"
              type="text"
              className="form-input"
              placeholder="My Store"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Store URL</label>
            <input
              name="storeUrl"
              type="text"
              className="form-input"
              placeholder={platform === 'WOOCOMMERCE' ? 'mystore.com' : 'mystore.myshopify.com'}
              required
            />
          </div>

          {platform === 'WOOCOMMERCE' ? (
            <>
              <div className="form-group">
                <label className="form-label">Consumer Key</label>
                <input
                  name="consumerKey"
                  type="text"
                  className="form-input"
                  placeholder="ck_xxxxx"
                  required
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Consumer Secret</label>
                <input
                  name="consumerSecret"
                  type="password"
                  className="form-input"
                  placeholder="cs_xxxxx"
                  required
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label">Access Token</label>
              <input
                name="accessToken"
                type="password"
                className="form-input"
                placeholder="shpat_xxxxx"
                required
                style={{ fontFamily: 'monospace' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={isPending}
            >
              {isPending ? 'Adding...' : 'Add Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
