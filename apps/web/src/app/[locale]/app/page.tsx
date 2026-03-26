'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Cookies from 'js-cookie';

// ─── Fiscal Setup Banner ──────────────────────────────────────────────────────

function FiscalSetupBanner() {
  const t = useTranslations('dashboard');
  const [missing, setMissing] = useState<string[] | null>(null);

  useEffect(() => {
    api.get('/tenants/fiscal-config').then((res) => {
      const fiscal = res.data ?? {};
      const m: string[] = [];
      if (!fiscal.inscricaoMunicipal) m.push('Inscrição Municipal');
      if (!fiscal.codigoMunicipio) m.push('Código IBGE do Município');
      if (!fiscal.logradouro || !fiscal.municipio) m.push('Endereço da empresa');
      setMissing(m);
    }).catch(() => setMissing(null));
  }, []);

  if (!missing || missing.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">{t('fiscalIncompleteTitle')}</p>
        <p className="text-sm text-amber-700 mt-0.5">{t('fiscalIncompleteDesc')}</p>
        <p className="text-xs text-amber-600 mt-1">{t('fiscalIncompleteMissing', { fields: missing.join(', ') })}</p>
      </div>
      <Link
        href="/app/settings/fiscal"
        className="flex-shrink-0 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
      >
        {t('fiscalIncompleteAction')}
      </Link>
    </div>
  );
}

// ─── Company Dashboard ───────────────────────────────────────────────────────

const quickLinks = [
  {
    key: 'products',
    href: '/app/products',
    color: 'bg-blue-50 hover:bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-100',
    icon: 'm20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z',
  },
  {
    key: 'categories',
    href: '/app/categories',
    color: 'bg-emerald-50 hover:bg-emerald-100',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-100',
    icon: 'M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z',
  },
  {
    key: 'invoices',
    href: '/app/invoices',
    color: 'bg-violet-50 hover:bg-violet-100',
    iconColor: 'text-violet-600',
    borderColor: 'border-violet-100',
    icon: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
  },
  {
    key: 'reports',
    href: '/app/reports',
    color: 'bg-amber-50 hover:bg-amber-100',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-100',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  },
  {
    key: 'support',
    href: '/app/support',
    color: 'bg-cyan-50 hover:bg-cyan-100',
    iconColor: 'text-cyan-600',
    borderColor: 'border-cyan-100',
    icon: 'M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z',
  },
  {
    key: 'sales',
    href: '/app/sales',
    color: 'bg-green-50 hover:bg-green-100',
    iconColor: 'text-green-600',
    borderColor: 'border-green-100',
    icon: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z',
  },
  {
    key: 'serviceOrders',
    href: '/app/service-orders',
    color: 'bg-teal-50 hover:bg-teal-100',
    iconColor: 'text-teal-600',
    borderColor: 'border-teal-100',
    icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z',
  },
  {
    key: 'affiliates',
    href: '/app/affiliates',
    color: 'bg-rose-50 hover:bg-rose-100',
    iconColor: 'text-rose-600',
    borderColor: 'border-rose-100',
    icon: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
  },
];

const translationMap: Record<string, string> = {
  products: 'products.title',
  categories: 'categories.title',
  invoices: 'invoices.title',
  sales: 'sales.title',
  serviceOrders: 'serviceOrders.title',
  reports: 'reports.title',
  support: 'support.title',
  affiliates: 'affiliate.title',
};

const descriptionMap: Record<string, string> = {
  products: 'dashboard.productsDesc',
  categories: 'dashboard.categoriesDesc',
  invoices: 'dashboard.invoicesDesc',
  sales: 'dashboard.salesDesc',
  serviceOrders: 'dashboard.serviceOrdersDesc',
  reports: 'dashboard.reportsDesc',
  support: 'dashboard.supportDesc',
  affiliates: 'dashboard.affiliatesDesc',
};

import { DashboardCards } from '@/components/DashboardCards';
import { RevenueChart } from '@/components/RevenueChart';

function CompanyDashboard() {
  const t = useTranslations();
  return (
    <div>
      <FiscalSetupBanner />
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('nav.dashboard')}</h1>
        <p className="mt-1 text-gray-500">{t('dashboard.welcome')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {quickLinks.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className={`group relative ${link.color} rounded-2xl p-6 border ${link.borderColor} transition-all duration-200 hover:shadow-md`}
          >
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/80 ${link.iconColor} mb-4 shadow-sm`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{t(translationMap[link.key])}</h3>
            <p className="mt-1 text-sm text-gray-600">{t(descriptionMap[link.key])}</p>
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className={`w-5 h-5 ${link.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Affiliate Dashboard ──────────────────────────────────────────────────────

function AffiliateDashboard() {
  const t = useTranslations();
  const [profile, setProfile] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/affiliates/my/profile').catch(() => ({ data: null })),
      api.get('/affiliates/my/commissions?limit=5').catch(() => ({ data: { data: [] } })),
    ]).then(([profileRes, commissionsRes]) => {
      setProfile(profileRes.data);
      const data = commissionsRes.data;
      setCommissions(Array.isArray(data) ? data : (data?.data || []));
    }).finally(() => setLoading(false));
  }, []);

  const totalEarned = commissions
    .filter((c) => c.status === 'PAID')
    .reduce((sum, c) => sum + (c.commissionCents || 0), 0);

  const totalPending = commissions
    .filter((c) => c.status === 'PENDING')
    .reduce((sum, c) => sum + (c.commissionCents || 0), 0);

  const linkedCompanies = profile?.tenantLinks?.length ?? 0;

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <svg className="animate-spin h-6 w-6 text-rose-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('affiliate.dashboardTitle')}</h1>
          <span className="px-2.5 py-1 text-xs font-semibold bg-rose-100 text-rose-700 rounded-full">
            {t('auth.accountTypeAffiliate')}
          </span>
        </div>
        <p className="text-gray-500">{t('affiliate.dashboardWelcome')}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">{t('affiliate.totalEarnings')}</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalEarned)}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>{t('affiliate.statusPaid')}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">{t('affiliate.pendingEarnings')}</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>{t('affiliate.statusPending')}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">{t('affiliate.linkedCompanies')}</p>
          <p className="text-2xl font-bold text-blue-600">{linkedCompanies}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-blue-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            <span>{t('affiliate.statusActive')}</span>
          </div>
        </div>
      </div>

      {/* Linked companies */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{t('affiliate.myCompanies')}</h2>
        </div>
        {!profile?.tenantLinks || profile.tenantLinks.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            {t('affiliate.noCompanies')}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {profile.tenantLinks.map((link: any, i: number) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                    {link.tenantId?.slice(0, 2).toUpperCase() || 'CO'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{link.tenantId}</p>
                    <p className="text-xs text-gray-400">{formatDate(link.linkedAt)}</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full font-medium">
                  {profile.type === 'PARTNER' ? '40%' : '10%'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent commissions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{t('affiliate.recentCommissions')}</h2>
          <Link href="/app/affiliates/commissions" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            {t('affiliate.viewAllCommissions')} →
          </Link>
        </div>
        {commissions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            {t('affiliate.noCommissions')}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {commissions.slice(0, 5).map((c: any, i: number) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(c.commissionCents || 0)}</p>
                  <p className="text-xs text-gray-400">{c.commissionPercent}% · {c.createdAt ? formatDate(c.createdAt) : '—'}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  c.status === 'PAID'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {c.status === 'PAID' ? t('affiliate.statusPaid') : t('affiliate.statusPending')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('accessToken');
    if (!token) return;
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (user?.roles?.includes('AFFILIATE')) {
    return <AffiliateDashboard />;
  }

  return <CompanyDashboard />;
}
