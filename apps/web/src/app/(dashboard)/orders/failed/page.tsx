'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Clock,
  XCircle,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';

interface FailedOrder {
  id: string;
  orderId: string;
  externalOrderId?: string;
  storeId: string;
  storeName?: string;
  customerEmail: string;
  total: number;
  status: string;
  fulfillmentStatus: string;
  fulfillmentAttempts: number;
  lastFulfillmentError: string | null;
  nextRetryAt: string | null;
  createdAt: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  RETRY_1: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  RETRY_2: { bg: 'bg-orange-100', text: 'text-orange-700' },
  RETRY_3: { bg: 'bg-red-100', text: 'text-red-700' },
  FAILED: { bg: 'bg-red-200', text: 'text-red-800' },
};

export default function FailedOrdersPage() {
  const [orders, setOrders] = useState<FailedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [retryingOrders, setRetryingOrders] = useState<string[]>([]);

  useEffect(() => {
    fetchFailedOrders();
  }, []);

  const fetchFailedOrders = async () => {
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';
      const res = await fetch(`${API_BASE}/orders/failed`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch failed orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryOrder = async (orderId: string) => {
    setRetryingOrders((prev) => [...prev, orderId]);
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';
      const res = await fetch(`${API_BASE}/orders/${orderId}/retry`, { method: 'POST' });
      if (res.ok) {
        // Remove from list or refresh
        fetchFailedOrders();
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setRetryingOrders((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleBulkRetry = async () => {
    if (selectedOrders.length === 0) return;
    const ordersToRetry = [...selectedOrders];
    setRetryingOrders(ordersToRetry);
    setSelectedOrders([]);

    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';
      await Promise.all(
        ordersToRetry.map((orderId) =>
          fetch(`${API_BASE}/orders/${orderId}/retry`, { method: 'POST' })
        )
      );
      fetchFailedOrders();
    } catch (error) {
      console.error('Bulk retry failed:', error);
    } finally {
      setRetryingOrders([]);
    }
  };

  const handleCancelRetry = async (orderId: string) => {
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';
      await fetch(`${API_BASE}/orders/${orderId}/cancel-retry`, { method: 'POST' });
      fetchFailedOrders();
    } catch (error) {
      console.error('Cancel retry failed:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((o) => o.orderId));
    }
  };

  const handleSelectOrder = (orderId: string) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const formatTimeUntilRetry = (nextRetryAt: string | null) => {
    if (!nextRetryAt) return 'N/A';
    const now = new Date();
    const retry = new Date(nextRetryAt);
    const diff = retry.getTime() - now.getTime();

    if (diff <= 0) return 'Retrying soon...';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/orders"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--gray-500)',
            marginBottom: '1rem',
          }}
        >
          <ArrowLeft size={16} />
          Back to Orders
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={28} className="text-red-600" />
              Failed Orders
            </h1>
            <p style={{ color: 'var(--gray-500)' }}>
              Orders that failed to fulfill and are scheduled for retry
            </p>
          </div>

          {selectedOrders.length > 0 && (
            <button className="btn btn-primary" onClick={handleBulkRetry}>
              <RotateCcw size={16} />
              Retry {selectedOrders.length} Orders
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {orders.length > 0 ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                    ORDER
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                    STORE
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                    STATUS
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                    ERROR
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                    ATTEMPTS
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                    NEXT RETRY
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                    TOTAL
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const colors = statusColors[order.fulfillmentStatus] || statusColors.FAILED;
                  const isRetrying = retryingOrders.includes(order.orderId);

                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.orderId)}
                          onChange={() => handleSelectOrder(order.orderId)}
                        />
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div>
                          <span style={{ fontWeight: 500 }}>
                            #{order.externalOrderId || order.orderId.slice(0, 8)}
                          </span>
                          <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                            {order.customerEmail}
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--gray-600)' }}>
                        {order.storeName || order.storeId.slice(0, 8)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          className={`${colors.bg} ${colors.text}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                          }}
                        >
                          {order.fulfillmentStatus === 'FAILED' ? (
                            <XCircle size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          {order.fulfillmentStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', maxWidth: '200px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--gray-600)',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={order.lastFulfillmentError || ''}
                        >
                          {order.lastFulfillmentError || 'Unknown error'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '9999px',
                            background: 'var(--gray-100)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {order.fulfillmentAttempts}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {order.fulfillmentStatus !== 'FAILED' && order.nextRetryAt && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                            <Clock size={14} className="text-blue-600" />
                            {formatTimeUntilRetry(order.nextRetryAt)}
                          </span>
                        )}
                        {order.fulfillmentStatus === 'FAILED' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                            Max retries reached
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                        ${order.total.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleRetryOrder(order.orderId)}
                            disabled={isRetrying}
                            title="Retry Now"
                          >
                            {isRetrying ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <RotateCcw size={14} />
                            )}
                          </button>
                          {order.fulfillmentStatus !== 'FAILED' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleCancelRetry(order.orderId)}
                              title="Cancel Retry"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <CheckCircle size={64} style={{ color: '#16a34a', marginBottom: '1.5rem' }} />
          <h2 style={{ marginBottom: '0.5rem', color: 'var(--gray-700)' }}>No Failed Orders</h2>
          <p style={{ color: 'var(--gray-500)' }}>
            All orders are processing successfully. Great job!
          </p>
        </div>
      )}

      {/* Retry Schedule Info */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">Retry Schedule</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: '0.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>RETRY 1</p>
            <p style={{ fontWeight: 600 }}>15 minutes</p>
          </div>
          <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: '0.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>RETRY 2</p>
            <p style={{ fontWeight: 600 }}>1 hour</p>
          </div>
          <div style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: '0.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>RETRY 3</p>
            <p style={{ fontWeight: 600 }}>4 hours</p>
          </div>
          <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '0.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#991b1b', marginBottom: '0.25rem' }}>FAILED</p>
            <p style={{ fontWeight: 600, color: '#dc2626' }}>Manual retry</p>
          </div>
        </div>
      </div>
    </div>
  );
}
