'use client';

import { useState, useTransition } from 'react';
import { Plus, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { addStore, testStoreConnection } from '@/lib/actions';

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
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; storeInfo?: any } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError('');

    const form = document.getElementById('add-store-form') as HTMLFormElement;
    const formData = new FormData(form);
    const storeUrl = formData.get('storeUrl') as string;

    if (!storeUrl) {
      setError('Please enter store URL');
      setIsTesting(false);
      return;
    }

    const credentials = platform === 'WOOCOMMERCE'
      ? {
          woocommerce: {
            consumerKey: formData.get('consumerKey') as string,
            consumerSecret: formData.get('consumerSecret') as string,
          },
        }
      : {
          shopify: {
            accessToken: formData.get('accessToken') as string,
          },
        };

    // Validate credentials
    if (platform === 'WOOCOMMERCE') {
      if (!credentials.woocommerce?.consumerKey || !credentials.woocommerce?.consumerSecret) {
        setError('Please enter Consumer Key and Consumer Secret');
        setIsTesting(false);
        return;
      }
    } else {
      if (!credentials.shopify?.accessToken) {
        setError('Please enter Access Token');
        setIsTesting(false);
        return;
      }
    }

    try {
      const result = await testStoreConnection({
        platform,
        storeUrl,
        credentials,
      });
      setTestResult(result);
    } catch (err) {
      setError('Failed to test connection');
    } finally {
      setIsTesting(false);
    }
  };

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

        <form id="add-store-form" action={handleSubmit}>
          {/* Platform Selection */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => { setPlatform('WOOCOMMERCE'); setTestResult(null); }}
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
              onClick={() => { setPlatform('SHOPIFY'); setTestResult(null); }}
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
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {testResult && (
            <div style={{
              background: testResult.success ? '#dcfce7' : '#fee2e2',
              color: testResult.success ? '#166534' : '#991b1b',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {testResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <div>
                {testResult.success ? (
                  <>
                    <strong>Connection Successful!</strong>
                    {testResult.storeInfo && (
                      <div style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>
                        Store: {testResult.storeInfo.name} | Version: {testResult.storeInfo.version}
                      </div>
                    )}
                  </>
                ) : (
                  testResult.message || 'Connection failed'
                )}
              </div>
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
              placeholder={platform === 'WOOCOMMERCE' ? 'https://mystore.com' : 'mystore.myshopify.com'}
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

          {/* Test Connection Button */}
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '1rem',
              border: '2px solid var(--gray-300)',
              borderRadius: '0.5rem',
              background: 'white',
              cursor: isTesting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontWeight: 500,
            }}
          >
            {isTesting ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Testing...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Test Connection
              </>
            )}
          </button>

          <div style={{ display: 'flex', gap: '1rem' }}>
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

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
