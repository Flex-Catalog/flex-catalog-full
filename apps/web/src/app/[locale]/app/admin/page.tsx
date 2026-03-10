'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
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

interface AffiliateRow {
  id: string;
  email: string;
  name: string | null;
  status: string;
  activeCompanies: number;
  totalEarnedCents: number;
  pendingCents: number;
  paidCents: number;
}

interface MonthlyRevenue {
  month: string;
  count: number;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  TRIAL: 'bg-blue-100 text-blue-800',
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PAST_DUE: 'bg-orange-100 text-orange-800',
  CANCELED: 'bg-red-100 text-red-800',
};

const fmtBRL = (cents: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(cents / 100);

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'tenants' | 'affiliates'>('tenants');

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/tenants'),
      api.get('/admin/affiliates'),
      api.get('/admin/stats/monthly-revenue'),
    ])
      .then(([statsRes, tenantsRes, affiliatesRes, monthlyRes]) => {
        setStats(statsRes.data);
        setTenants(tenantsRes.data.data);
        setAffiliates(affiliatesRes.data.data);
        setMonthly(monthlyRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-gray-500">{t('loading')}</div>;
  }

  const maxCount = Math.max(...monthly.map((m) => m.count), 1);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={t('totalCustomers')} value={stats.tenants.total} color="blue" />
          <StatCard label={t('activeCustomers')} value={stats.tenants.active} color="green" />
          <StatCard label={t('trialCustomers')} value={stats.tenants.trial} color="indigo" />
          <StatCard label={t('totalUsers')} value={stats.users.total} color="purple" />
        </div>
      )}

      {/* Monthly Active Chart */}
      {monthly.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('monthlyActiveTitle')}</h2>
          <div className="flex items-end gap-2 h-36">
            {monthly.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-medium">{m.count}</span>
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${Math.round((m.count / maxCount) * 96)}px`, minHeight: m.count > 0 ? '4px' : '0' }}
                />
                <span className="text-xs text-gray-400">{m.month.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coupons summary */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <StatCard label={t('totalCoupons')} value={stats.coupons.total} color="yellow" />
          <StatCard label={t('activeCoupons')} value={stats.coupons.active} color="green" />
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('tenants')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'tenants'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('customerList')}
        </button>
        <button
          onClick={() => setTab('affiliates')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'affiliates'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('affiliateList')} ({affiliates.length})
        </button>
      </div>

      {/* Tenants Table */}
      {tab === 'tenants' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                      {new Date(tenant.createdAt).toLocaleDateString(locale)}
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('noCustomers')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Affiliates Table */}
      {tab === 'affiliates' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('affiliateName')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('affiliateCompanies')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('affiliateTotalEarned')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('affiliatePending')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('affiliatePaid')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {affiliates.map((aff) => (
                  <tr key={aff.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{aff.name || aff.email}</p>
                      <p className="text-xs text-gray-400">{aff.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        aff.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {aff.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{aff.activeCompanies}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">{fmtBRL(aff.totalEarnedCents, locale)}</td>
                    <td className="px-6 py-4 text-right text-yellow-700">{fmtBRL(aff.pendingCents, locale)}</td>
                    <td className="px-6 py-4 text-right text-green-700">{fmtBRL(aff.paidCents, locale)}</td>
                  </tr>
                ))}
                {affiliates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('noAffiliates')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    green: 'bg-green-50 border-green-100 text-green-600',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-600',
  };
  const cls = colors[color] || colors.blue;
  const textCls = cls.split(' ')[2];
  return (
    <div className={`rounded-xl p-6 border ${cls}`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${textCls}`}>{value}</p>
    </div>
  );
}
