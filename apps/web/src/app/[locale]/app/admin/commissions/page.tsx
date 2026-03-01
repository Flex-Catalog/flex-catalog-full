'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

interface PendingCommission {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  payoutInfo: {
    method?: 'pix' | 'bank' | 'stripe';
    pixKeyType?: string;
    pixKey?: string;
    bankName?: string;
    bankAgency?: string;
    bankAccount?: string;
    bankAccountType?: string;
    stripeConnectAccountId?: string;
  } | null;
  tenant: { id: string; name: string };
  amountCents: number;
  commissionPercent: number;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

export default function AdminCommissionsPage() {
  const t = useTranslations();
  const ta = useTranslations('affiliate');

  const [commissions, setCommissions] = useState<PendingCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPayingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [total, setTotal] = useState(0);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/affiliates/admin/commissions/pending?limit=50');
      setCommissions(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCommissions(); }, []);

  const handlePay = async (id: string) => {
    setPayingId(id);
    setMessage('');
    try {
      const res = await api.post(`/affiliates/admin/commissions/${id}/pay`);
      const method = res.data?.method;
      setMessage(method === 'stripe' ? ta('payoutPaidStripe') : ta('payoutPaidManual'));
      fetchCommissions();
    } catch {
      setMessage(ta('payoutPayError'));
    } finally {
      setPayingId(null);
    }
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  const renderPayoutBadge = (info: PendingCommission['payoutInfo']) => {
    if (!info) return <span className="text-xs text-red-500 font-medium">{ta('payoutNotSet')}</span>;
    if (info.method === 'pix') return (
      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
        Pix · {info.pixKeyType?.toUpperCase()} · {info.pixKey}
      </span>
    );
    if (info.method === 'bank') return (
      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
        {info.bankName} · Ag {info.bankAgency} · {info.bankAccount}
      </span>
    );
    if (info.method === 'stripe') return (
      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
        Stripe · {info.stripeConnectAccountId}
      </span>
    );
    return null;
  };

  if (loading) return <div className="p-6">{t('common.loading')}</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{ta('adminCommissionsTitle')}</h1>
          <p className="text-sm text-gray-500 mt-1">{total} {ta('pendingCount')}</p>
        </div>
      </div>

      {message && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      {commissions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center text-gray-500">
          {ta('noPendingCommissions')}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{ta('affiliateName')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{ta('company')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{ta('payoutMethod')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">{ta('amount')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{ta('period')}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.affiliateName}</p>
                      <p className="text-xs text-gray-400">{c.affiliateEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{c.tenant?.name || '-'}</td>
                    <td className="px-4 py-3">{renderPayoutBadge(c.payoutInfo)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(c.amountCents)}
                      <span className="block text-xs text-gray-400 font-normal">{c.commissionPercent}%</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.periodStart && c.periodEnd
                        ? `${formatDate(c.periodStart)} - ${formatDate(c.periodEnd)}`
                        : formatDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handlePay(c.id)}
                        disabled={paying === c.id}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {paying === c.id ? '...' : ta('payNow')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {commissions.map((c) => (
              <div key={c.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{c.affiliateName}</p>
                    <p className="text-xs text-gray-400">{c.affiliateEmail}</p>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{formatCurrency(c.amountCents)}</p>
                </div>
                <p className="text-xs text-gray-500 mb-1">{c.tenant?.name} · {c.commissionPercent}%</p>
                <div className="mb-3">{renderPayoutBadge(c.payoutInfo)}</div>
                <button
                  onClick={() => handlePay(c.id)}
                  disabled={paying === c.id}
                  className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {paying === c.id ? '...' : ta('payNow')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
