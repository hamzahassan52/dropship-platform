'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { SalesData } from '@/lib/api';

interface SalesChartProps {
  data: SalesData[];
}

export function SalesChart({ data }: SalesChartProps) {
  if (!data || data.length === 0) {
    // Demo data when API not available
    const demoData = [
      { date: 'Mon', revenue: 1200, profit: 340, orders: 8 },
      { date: 'Tue', revenue: 980, profit: 280, orders: 6 },
      { date: 'Wed', revenue: 1450, profit: 410, orders: 10 },
      { date: 'Thu', revenue: 1100, profit: 310, orders: 7 },
      { date: 'Fri', revenue: 1680, profit: 480, orders: 12 },
      { date: 'Sat', revenue: 2100, profit: 600, orders: 15 },
      { date: 'Sun', revenue: 1890, profit: 540, orders: 13 },
    ];
    data = demoData;
  }

  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Revenue"
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Profit"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
