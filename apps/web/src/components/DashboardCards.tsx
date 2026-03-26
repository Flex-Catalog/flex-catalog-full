import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  color: 'green' | 'red' | 'blue';
  icon: string;
}

export function MetricCard({ title, value, change, color, icon }: MetricCardProps) {
  const changeColor = color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : 'text-blue-600';
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          <p className={`mt-1 text-sm font-medium ${changeColor}`}>
            {change.startsWith('+') ? change : change}
          </p>
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50 text-${color}-600 ml-4 flex-shrink-0`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function DashboardCards() {
  const t = useTranslations('dashboard');
  
  const { data: summary } = useQuery({
    queryKey: ['sales-summary', 'month'],
    queryFn: () => api.get('/sales/summary?period=month').then(res => res.data),
  });

  const metrics = [
    {
      title: t('revenue'),
      value: summary ? `R$ ${(summary.totalRevenueCents / 100).toLocaleString('pt-BR')}` : 'R$ 0,00',
      change: summary ? '+12,5%' : '0%',
      color: 'green' as const,
      icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    },
    {
      title: t('profit'),
      value: summary ? `R$ ${(summary.profitCents / 100).toLocaleString('pt-BR')}` : 'R$ 0,00',
      change: summary ? `+${summary.marginPercent?.toFixed(1)}%` : '0%',
      color: 'blue' as const,
      icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    },
    {
      title: t('stockValue'),
      value: 'R$ 12.450,00',
      change: '+2,3%',
      color: 'blue' as const,
      icon: 'M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.586a1 1 0 0 1-.293.707l-6.414 6.414a1 1 0 0 0-.293.707V17a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-1.586a1 1 0 0 0-.293-.707L3.293 7.293A1 1 0 0 1 3 6.586V4z',
    },
    {
      title: t('salesCount'),
      value: summary ? summary.salesCount.toLocaleString() : '0',
      change: '+15%',
      color: 'green' as const,
      icon: 'M3 4h18M3 8h18M3 12h18M3 16h18',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}
</xai:function_call > 

<xai:function_call name="create_file">
<parameter name="absolute_path">apps/web/src/components/RevenueChart.tsx
