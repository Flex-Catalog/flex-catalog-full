'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';

const CURRENCY_SYMBOL: Record<string, string> = { BRL: 'R$', USD: '$', EUR: '€' };
const COUNTRY_NAME: Record<string, string> = {
  BR: 'Brasil 🇧🇷',
  US: 'Estados Unidos 🇺🇸',
  PT: 'Portugal 🇵🇹',
  ES: 'Espanha 🇪🇸',
  AR: 'Argentina 🇦🇷',
  MX: 'México 🇲🇽',
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DRAFT:    { label: 'Rascunho',  color: 'bg-gray-100 text-gray-600' },
  PENDING:  { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-700' },
  ISSUED:   { label: 'Emitida',   color: 'bg-green-100 text-green-700' },
  FAILED:   { label: 'Falhou',    color: 'bg-red-100 text-red-700' },
  CANCELED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500' },
};

function formatCurrency(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  return `${sym} ${(amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {sub && <div className="mt-2 text-sm text-gray-500">{sub}</div>}
    </div>
  );
}

export default function ReportsPage() {
  const t = useTranslations();
  const { locale } = useParams() as { locale: string };

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  });

  const { data: productsReport } = useQuery({
    queryKey: ['dashboard', 'products'],
    queryFn: () => api.get('/dashboard/products').then((r) => r.data),
  });

  const { data: invoicesReport } = useQuery({
    queryKey: ['dashboard', 'invoices'],
    queryFn: () => api.get('/dashboard/invoices').then((r) => r.data),
  });

  if (isLoading) return <div className="text-gray-500 p-4">{t('common.loading')}</div>;

  const d = dashboard ?? {
    products: { total: 0, active: 0, inactive: 0 },
    categories: { total: 0 },
    invoices: { total: 0, issued: 0, pending: 0, draft: 0, failed: 0 },
    serviceOrders: { total: 0, open: 0, completed: 0 },
    revenue: { month: 0, byCurrency: [] },
  };

  const byCurrency: Array<{ currency: string; amount: number }> = d.revenue?.byCurrency ?? [];
  const hasMultipleCurrencies = byCurrency.length > 1;

  // Revenue display
  const revenueDisplay = () => {
    if (byCurrency.length === 0) {
      return <span className="text-2xl font-bold text-gray-400">—</span>;
    }
    if (hasMultipleCurrencies) {
      return (
        <div className="space-y-1 mt-2">
          {byCurrency.map((c) => (
            <div key={c.currency} className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500">{c.currency}</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(c.amount, c.currency)}</span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <p className="text-3xl font-bold text-gray-900 mt-2">
        {formatCurrency(byCurrency[0].amount, byCurrency[0].currency)}
      </p>
    );
  };

  const statusEntries = Object.entries(invoicesReport?.byStatus ?? {}) as Array<[string, number]>;
  const countryEntries = Object.entries(invoicesReport?.byCountry ?? {}) as Array<[string, number]>;
  const byCategory = (productsReport?.byCategory ?? []) as Array<{
    categoryId: string | null;
    categoryName: string;
    count: number;
  }>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label={t('reports.products')}
          value={d.products.total}
          sub={
            <>
              <span className="text-green-600 font-medium">{d.products.active} {t('reports.active')}</span>
              {' · '}
              <span className="text-red-500">{d.products.inactive} {t('reports.inactive')}</span>
            </>
          }
        />
        <StatCard
          label={t('reports.categories')}
          value={d.categories.total}
        />
        <StatCard
          label="Ordens de Serviço"
          value={d.serviceOrders?.total ?? 0}
          sub={
            <>
              <span className="text-blue-600 font-medium">{d.serviceOrders?.open ?? 0} abertas</span>
              {' · '}
              <span className="text-green-600">{d.serviceOrders?.completed ?? 0} concluídas</span>
            </>
          }
        />
        <StatCard
          label="Notas Fiscais (NF-e)"
          value={d.invoices.total}
          sub={
            <>
              <span className="text-green-600 font-medium">{d.invoices.issued} {t('reports.issued')}</span>
              {' · '}
              <span className="text-yellow-600">{d.invoices.pending} {t('reports.pending')}</span>
            </>
          }
        />

        {/* Revenue card */}
        <div className="bg-white rounded-lg shadow p-5 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Receita do Mês
          </p>
          <p className="text-xs text-gray-400 mt-0.5">NF-e emitidas</p>
          {byCurrency.length === 0 ? (
            <p className="text-2xl font-bold text-gray-400 mt-2">—</p>
          ) : hasMultipleCurrencies ? (
            <div className="space-y-1 mt-2">
              {byCurrency.map((c) => (
                <div key={c.currency} className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">{c.currency}</span>
                  <span className="text-base font-bold text-gray-900">{formatCurrency(c.amount, c.currency)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {formatCurrency(byCurrency[0].amount, byCurrency[0].currency)}
            </p>
          )}
        </div>
      </div>

      {/* Detail sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* Notas por Status */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Notas Fiscais por Status</h2>
          {statusEntries.length === 0 ? (
            <p className="text-sm text-gray-400">{t('reports.noData')}</p>
          ) : (
            <div className="space-y-2">
              {statusEntries.map(([status, count]) => {
                const meta = STATUS_LABEL[status] ?? { label: status, color: 'bg-gray-100 text-gray-600' };
                return (
                  <div key={status} className="flex justify-between items-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Produtos por Categoria */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Distribuição de Produtos</h2>
          {byCategory.length === 0 ? (
            <p className="text-sm text-gray-400">{t('reports.noData')}</p>
          ) : (
            <div className="space-y-2">
              {byCategory.map((item) => {
                const pct = d.products.total > 0 ? Math.round((item.count / d.products.total) * 100) : 0;
                return (
                  <div key={item.categoryId ?? 'uncategorized'}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-sm text-gray-700">{item.categoryName || t('reports.uncategorized')}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Emissões por País */}
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Emissões por País</h2>
          {countryEntries.length === 0 ? (
            <p className="text-sm text-gray-400">{t('reports.noData')}</p>
          ) : (
            <div className="space-y-2">
              {countryEntries.map(([country, count]) => (
                <div key={country} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">{COUNTRY_NAME[country] ?? country}</span>
                  <span className="text-sm font-semibold text-gray-900">{count} notas</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
