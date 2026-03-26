'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface ChartData {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

export function RevenueChart({ days = 30 }: { days?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-chart', days],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      
      const res = await api.get('/dashboard/revenue', {
        params: { 
          period: 'daily',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });
      return res.data.data;
    },
  });

  const chartData: ChartData[] = data || [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Receita vs Custo</h3>
        <p className="text-sm text-gray-500">Últimos {days} dias</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f8fafc" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(value) => `R$ ${value.toLocaleString()}`}
            />
            <Tooltip 
              formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Receita']}
              labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#10b981" 
              strokeWidth={3}
              name="Receita"
            />
            <Line 
              type="monotone" 
              dataKey="cost" 
              stroke="#f59e0b" 
              strokeWidth={3}
              name="Custo"
              strokeDasharray="5 5"
            />
            <Area 
              type="monotone" 
              dataKey="profit" 
              stroke="#059669" 
              fill="#d1fae5" 
              name="Lucro"
              fillOpacity={0.3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

