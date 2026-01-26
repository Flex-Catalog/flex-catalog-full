'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DashboardData {
  products: {
    total: number;
    active: number;
    inactive: number;
  };
  categories: {
    total: number;
  };
  invoices: {
    total: number;
    issued: number;
    pending: number;
    totalRevenue: number;
  };
  users: {
    total: number;
    active: number;
  };
}

export default function ReportsPage() {
  const t = useTranslations();

  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => {
      const res = await api.get('/reports/dashboard');
      return res.data;
    },
  });

  const { data: productsReport } = useQuery({
    queryKey: ['reports', 'products'],
    queryFn: async () => {
      const res = await api.get('/reports/products');
      return res.data;
    },
  });

  const { data: salesReport } = useQuery({
    queryKey: ['reports', 'sales'],
    queryFn: async () => {
      const res = await api.get('/reports/sales');
      return res.data;
    },
  });

  const { data: categoriesReport } = useQuery({
    queryKey: ['reports', 'categories'],
    queryFn: async () => {
      const res = await api.get('/reports/categories');
      return res.data;
    },
  });

  if (loadingDashboard) {
    return <div>{t('common.loading')}</div>;
  }

  const data: DashboardData = dashboard?.data || {
    products: { total: 0, active: 0, inactive: 0 },
    categories: { total: 0 },
    invoices: { total: 0, issued: 0, pending: 0, totalRevenue: 0 },
    users: { total: 0, active: 0 },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('reports.title')}</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase">{t('reports.products')}</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{data.products.total}</p>
          <div className="mt-2 text-sm">
            <span className="text-green-600">{data.products.active} {t('reports.active')}</span>
            <span className="text-gray-400 mx-2">|</span>
            <span className="text-red-600">{data.products.inactive} {t('reports.inactive')}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase">{t('reports.categories')}</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{data.categories.total}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase">{t('reports.invoices')}</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{data.invoices.total}</p>
          <div className="mt-2 text-sm">
            <span className="text-green-600">{data.invoices.issued} {t('reports.issued')}</span>
            <span className="text-gray-400 mx-2">|</span>
            <span className="text-yellow-600">{data.invoices.pending} {t('reports.pending')}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium uppercase">{t('reports.revenue')}</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ${(data.invoices.totalRevenue / 100).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Detailed Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Products by Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('reports.productsByCategory')}</h2>
          <div className="space-y-3">
            {productsReport?.data?.byCategory?.map((item: any) => (
              <div key={item.categoryId || 'uncategorized'} className="flex justify-between items-center">
                <span className="text-gray-700">{item.categoryName || t('reports.uncategorized')}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
            {(!productsReport?.data?.byCategory || productsReport.data.byCategory.length === 0) && (
              <p className="text-gray-500">{t('reports.noData')}</p>
            )}
          </div>
        </div>

        {/* Sales by Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('reports.salesByStatus')}</h2>
          <div className="space-y-3">
            {salesReport?.data?.byStatus?.map((item: any) => (
              <div key={item.status} className="flex justify-between items-center">
                <span className="text-gray-700">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                    item.status === 'ISSUED' ? 'bg-green-500' :
                    item.status === 'PENDING' ? 'bg-yellow-500' :
                    item.status === 'DRAFT' ? 'bg-gray-500' :
                    item.status === 'FAILED' ? 'bg-red-500' : 'bg-gray-300'
                  }`}></span>
                  {item.status}
                </span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
            {(!salesReport?.data?.byStatus || salesReport.data.byStatus.length === 0) && (
              <p className="text-gray-500">{t('reports.noData')}</p>
            )}
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('reports.topCategories')}</h2>
          <div className="space-y-3">
            {categoriesReport?.data?.topCategories?.slice(0, 5).map((item: any, index: number) => (
              <div key={item.id} className="flex justify-between items-center">
                <span className="text-gray-700">
                  <span className="text-gray-400 mr-2">#{index + 1}</span>
                  {item.name}
                </span>
                <span className="font-semibold">{item.productCount} {t('reports.products')}</span>
              </div>
            ))}
            {(!categoriesReport?.data?.topCategories || categoriesReport.data.topCategories.length === 0) && (
              <p className="text-gray-500">{t('reports.noData')}</p>
            )}
          </div>
        </div>

        {/* Sales by Country */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('reports.salesByCountry')}</h2>
          <div className="space-y-3">
            {salesReport?.data?.byCountry?.map((item: any) => (
              <div key={item.country} className="flex justify-between items-center">
                <span className="text-gray-700">
                  <span className="mr-2">
                    {item.country === 'BR' ? '🇧🇷' :
                     item.country === 'US' ? '🇺🇸' :
                     item.country === 'PT' ? '🇵🇹' : '🌍'}
                  </span>
                  {item.country}
                </span>
                <div className="text-right">
                  <span className="font-semibold">{item.count}</span>
                  <span className="text-gray-400 ml-2">
                    (${(item.revenue / 100).toFixed(2)})
                  </span>
                </div>
              </div>
            ))}
            {(!salesReport?.data?.byCountry || salesReport.data.byCountry.length === 0) && (
              <p className="text-gray-500">{t('reports.noData')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
