'use client';

import { useState } from 'react';
import { Clock, Truck, CheckCircle, Package, ShoppingCart } from 'lucide-react';
import { StoreStats } from '@/lib/api';

interface StoreDetailTabsProps {
  storeId: string;
  stats: StoreStats | null;
}

const demoOrders = [
  { id: '#1234', customer: 'customer@example.com', status: 'pending', total: 89.99, profit: 24.50, date: 'Jan 10, 2024' },
  { id: '#1233', customer: 'john@example.com', status: 'shipped', total: 149.99, profit: 42.00, date: 'Jan 9, 2024' },
  { id: '#1232', customer: 'sarah@example.com', status: 'delivered', total: 59.99, profit: 18.00, date: 'Jan 8, 2024' },
  { id: '#1231', customer: 'mike@example.com', status: 'processing', total: 199.99, profit: 56.00, date: 'Jan 7, 2024' },
];

export function StoreDetailTabs({ storeId, stats }: StoreDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <>
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button
          className={`tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h2 className="card-title">Recent Orders</h2>
            <button className="btn btn-primary btn-sm">Export</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Profit</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demoOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace' }}>{order.id}</td>
                    <td>{order.customer}</td>
                    <td>
                      <span className={`status-badge ${order.status}`}>
                        {order.status === 'pending' && <Clock size={12} />}
                        {order.status === 'processing' && <Package size={12} />}
                        {order.status === 'shipped' && <Truck size={12} />}
                        {order.status === 'delivered' && <CheckCircle size={12} />}
                        <span style={{ marginLeft: '0.25rem', textTransform: 'capitalize' }}>
                          {order.status}
                        </span>
                      </span>
                    </td>
                    <td>${order.total.toFixed(2)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 500 }}>
                      +${order.profit.toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--gray-500)' }}>{order.date}</td>
                    <td>
                      {order.status === 'pending' ? (
                        <button className="btn btn-primary btn-sm">Fulfill</button>
                      ) : order.status === 'shipped' ? (
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
        </div>
      )}

      {activeTab === 'products' && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h2 className="card-title">Products</h2>
            <button className="btn btn-primary btn-sm">Import Product</button>
          </div>
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
            <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No products imported yet. Import products from CJ Dropshipping.</p>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header">
            <h2 className="card-title">Detailed Analytics</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem 0' }}>
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
                {stats?.totalOrders || 0}
              </div>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Total Orders</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
                {stats?.fulfillmentRate?.toFixed(0) || 0}%
              </div>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Fulfillment Rate</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>
                ${((stats?.totalRevenue || 0) / (stats?.totalOrders || 1)).toFixed(2)}
              </div>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Avg Order Value</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6' }}>
                {stats?.profitMargin?.toFixed(1) || 0}%
              </div>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Profit Margin</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
