'use client';

import { useState } from 'react';

interface AddStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: StoreFormData) => Promise<void>;
}

interface StoreFormData {
  name: string;
  platform: 'WOOCOMMERCE' | 'SHOPIFY';
  storeUrl: string;
  credentials: {
    woocommerce?: { consumerKey: string; consumerSecret: string };
    shopify?: { accessToken: string };
  };
}

export default function AddStoreModal({ isOpen, onClose, onAdd }: AddStoreModalProps) {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState<'WOOCOMMERCE' | 'SHOPIFY' | null>(null);
  const [name, setName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState('');

  const resetForm = () => {
    setStep(1);
    setPlatform(null);
    setName('');
    setStoreUrl('');
    setConsumerKey('');
    setConsumerSecret('');
    setAccessToken('');
    setError('');
    setTestResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError('');

    try {
      const res = await fetch('/api/stores/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          storeUrl,
          credentials: {
            woocommerce: platform === 'WOOCOMMERCE' ? { consumerKey, consumerSecret } : undefined,
            shopify: platform === 'SHOPIFY' ? { accessToken } : undefined,
          },
        }),
      });

      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.success ? `Connected to ${data.storeInfo?.name || 'store'}` : data.message || data.error,
      });
    } catch {
      setTestResult({ success: false, message: 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!platform || !name || !storeUrl) {
      setError('Please fill all required fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onAdd({
        name,
        platform,
        storeUrl,
        credentials: {
          woocommerce: platform === 'WOOCOMMERCE' ? { consumerKey, consumerSecret } : undefined,
          shopify: platform === 'SHOPIFY' ? { accessToken } : undefined,
        },
      });
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add store');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 1 ? 'Select Platform' : step === 2 ? 'Store Details' : 'Credentials'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            X
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">Choose your e-commerce platform:</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setPlatform('WOOCOMMERCE'); setStep(2); }}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">
                    W
                  </div>
                  <p className="font-medium text-gray-900">WooCommerce</p>
                </button>
                <button
                  onClick={() => { setPlatform('SHOPIFY'); setStep(2); }}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">
                    S
                  </div>
                  <p className="font-medium text-gray-900">Shopify</p>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Store"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store URL</label>
                <input
                  type="text"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder={platform === 'SHOPIFY' ? 'mystore.myshopify.com' : 'https://mystore.com'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!name || !storeUrl}
                  className="flex-1 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {platform === 'WOOCOMMERCE' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Key</label>
                    <input
                      type="text"
                      value={consumerKey}
                      onChange={(e) => setConsumerKey(e.target.value)}
                      placeholder="ck_..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Secret</label>
                    <input
                      type="password"
                      value={consumerSecret}
                      onChange={(e) => setConsumerSecret(e.target.value)}
                      placeholder="cs_..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="shpat_..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  />
                </div>
              )}

              {testResult && (
                <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {testResult.message}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700">{error}</div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Back
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || (platform === 'WOOCOMMERCE' ? !consumerKey || !consumerSecret : !accessToken)}
                  className="px-4 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
                >
                  {isTesting ? 'Testing...' : 'Test'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || (platform === 'WOOCOMMERCE' ? !consumerKey || !consumerSecret : !accessToken)}
                  className="flex-1 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Adding...' : 'Add Store'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-indigo-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
