'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const salesData = [
  { date: 'Mon', revenue: 1200, profit: 340 },
  { date: 'Tue', revenue: 980, profit: 280 },
  { date: 'Wed', revenue: 1450, profit: 410 },
  { date: 'Thu', revenue: 1100, profit: 310 },
  { date: 'Fri', revenue: 1680, profit: 480 },
  { date: 'Sat', revenue: 2100, profit: 600 },
  { date: 'Sun', revenue: 1890, profit: 540 },
];

const fulfillmentData = [
  { status: 'Fulfilled', count: 145, color: '#10b981' },
  { status: 'Processing', count: 23, color: '#3b82f6' },
  { status: 'Pending', count: 8, color: '#f59e0b' },
  { status: 'Failed', count: 2, color: '#ef4444' },
];

export function StoreDetailCharts() {
  return (
    <div className="charts-grid">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Revenue & Profit (Last 7 Days)</h2>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Profit"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Fulfillment Statistics</h2>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fulfillmentData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis dataKey="status" type="category" stroke="#6b7280" fontSize={12} width={80} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {fulfillmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
