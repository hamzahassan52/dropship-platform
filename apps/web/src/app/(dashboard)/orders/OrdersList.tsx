'use client';

import { useState, useTransition } from 'react';
import {
  Search,
  RefreshCw,
  Package,
  Truck,
  CheckCircle,
  Clock,
  ShoppingCart
} from 'lucide-react';
import { Order } from '@/lib/api';
import { fulfillOrder, fulfillAllOrders } from '@/lib/actions';

interface OrdersListProps {
  initialOrders: Order[];
}

export function OrdersList({ initialOrders }: OrdersListProps) {
  const [orders] = useState(initialOrders);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);

  const handleFulfill = (orderId: string) => {
    setFulfillingId(orderId);
    startTransition(async () => {
      await fulfillOrder(orderId);
      setFulfillingId(null);
    });
  };

  const handleFulfillAll = () => {
    startTransition(async () => {
      await fulfillAllOrders();
    });
  };

  const filteredOrders = orders.filter((order) => {
    const matchesFilter = filter === 'all' || order.status.toLowerCase() === filter;
    const matchesSearch =
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.externalOrderId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return <Clock size={12} />;
      case 'processing': return <Package size={12} />;
      case 'shipped': return <Truck size={12} />;
      case 'delivered': return <CheckCircle size={12} />;
      default: return <ShoppingCart size={12} />;
    }
  };

  return (
    <>
      {/* Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Refresh
          </button>
          {pendingCount > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleFulfillAll}
              disabled={isPending}
            >
              <Package size={16} />
              {isPending ? 'Fulfilling...' : `Fulfill All (${pendingCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--gray-400)',
              }}
            />
            <input
              type="text"
              placeholder="Search by email or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['all', 'pending', 'processing', 'shipped', 'delivered'].map((f) => (
              <button
                key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            {filter === 'all' ? 'All Orders' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Orders`}
            <span style={{ color: 'var(--gray-500)', fontWeight: 400, marginLeft: '0.5rem' }}>
              ({filteredOrders.length})
            </span>
          </h2>
        </div>

        {filteredOrders.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Store</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Profit</th>
                  <th>Date</th>
                  <th>Tracking</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace' }}>
                      #{order.externalOrderId || order.id.slice(0, 8)}
                    </td>
                    <td>
                      {order.store && (
                        <span
                          className={`store-badge ${order.store.platform?.toLowerCase() || 'woocommerce'}`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {order.store.name}
                        </span>
                      )}
                    </td>
                    <td>{order.customerEmail || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${order.status.toLowerCase()}`}>
                        {getStatusIcon(order.status)}
                        <span style={{ marginLeft: '0.25rem' }}>{order.status}</span>
                      </span>
                    </td>
                    <td>${order.total?.toFixed(2) || '0.00'}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 500 }}>
                      +${order.profit?.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {order.trackingNumber || '-'}
                    </td>
                    <td>
                      {order.status === 'PENDING' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleFulfill(order.id)}
                          disabled={isPending && fulfillingId === order.id}
                        >
                          {fulfillingId === order.id ? 'Fulfilling...' : 'Fulfill'}
                        </button>
                      ) : order.status === 'SHIPPED' ? (
                        <button className="btn btn-secondary btn-sm">
                          <Truck size={12} /> Track
                        </button>
                      ) : (
                        <button className="btn btn-secondary btn-sm">View</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
            <ShoppingCart size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No orders found</p>
          </div>
        )}
      </div>
    </>
  );
}
