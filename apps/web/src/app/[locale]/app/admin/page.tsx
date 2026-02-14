'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

interface DashboardStats {
  tenants: { total: number; active: number; trial: number; canceled: number };
  users: { total: number };
  coupons: { total: number; active: number };
}

interface TenantRow {
  id: string;
  name: string;
  country: string;
  status: string;
  taxId?: string;
  userCount: number;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  TRIAL: 'bg-blue-100 text-blue-800',
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PAST_DUE: 'bg-orange-100 text-orange-800',
  CANCELED: 'bg-red-100 text-red-800',
};

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/tenants'),
    ])
      .then(([statsRes, tenantsRes]) => {
        setStats(statsRes.data);
        setTenants(tenantsRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-gray-500">{t('loading')}</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label={t('totalCustomers')} value={stats.tenants.total} color="blue" />
          <StatCard label={t('activeCustomers')} value={stats.tenants.active} color="green" />
          <StatCard label={t('trialCustomers')} value={stats.tenants.trial} color="indigo" />
          <StatCard label={t('totalUsers')} value={stats.users.total} color="purple" />
        </div>
      )}

      {/* Coupons summary */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <StatCard label={t('totalCoupons')} value={stats.coupons.total} color="yellow" />
          <StatCard label={t('activeCoupons')} value={stats.coupons.active} color="green" />
        </div>
      )}

      {/* Tenants Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('customerList')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('company')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('country')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('taxIdLabel')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('createdAt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{tenant.name}</td>
                  <td className="px-6 py-4 text-gray-600">{tenant.country}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[tenant.status] || 'bg-gray-100 text-gray-800'}`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{tenant.taxId || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{tenant.userCount}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {t('noCustomers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const bgColor = `bg-${color}-50`;
  const textColor = `text-${color}-600`;
  return (
    <div className={`rounded-xl p-6 ${bgColor} border border-${color}-100`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className={`text-3xl font-bold ${textColor} mt-2`}>{value}</p>
    </div>
  );
}
