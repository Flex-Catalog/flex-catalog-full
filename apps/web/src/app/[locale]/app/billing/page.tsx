'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function BillingPage() {
  const t = useTranslations('billing');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    api
      .get('/billing/status')
      .then((res) => setStatus(res.data))
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await api.post('/billing/checkout');
      window.location.href = res.data.url;
    } catch {
      alert(t('checkoutError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      const res = await api.post('/billing/portal');
      window.location.href = res.data.url;
    } catch {
      alert(t('portalError'));
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: t('active'), className: 'bg-green-100 text-green-700' },
      TRIAL: { label: t('trial'), className: 'bg-blue-100 text-blue-700' },
      PAST_DUE: { label: t('pastDue'), className: 'bg-amber-100 text-amber-700' },
      CANCELED: { label: t('canceled'), className: 'bg-red-100 text-red-700' },
      PENDING_PAYMENT: { label: t('pending'), className: 'bg-gray-100 text-gray-700' },
    };
    const cfg = map[s] || map.PENDING_PAYMENT;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${cfg.className}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('title')}</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Current plan */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">FlexCatalog Pro</h2>
            {statusLoading ? (
              <div className="w-20 h-6 bg-gray-100 rounded-full animate-pulse" />
            ) : (
              status && statusBadge(status.status)
            )}
          </div>

          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-bold text-gray-900">{t('price')}</span>
            <span className="text-gray-500">/{t('perMonth')}</span>
          </div>

          {!statusLoading && status && (
            <div className="space-y-2 text-sm text-gray-600">
              {status.trialEndsAt && status.status === 'TRIAL' && (
                <p>
                  {t('trialEnds')}: {new Date(status.trialEndsAt).toLocaleDateString()}
                </p>
              )}
              {status.currentPeriodEnd && status.status === 'ACTIVE' && (
                <p>
                  {t('nextBilling')}: {new Date(status.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              <p>
                {t('paymentMethod')}: {status.hasPaymentMethod ? t('cardOnFile') : t('noCard')}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {status?.status === 'ACTIVE' || status?.status === 'TRIAL' ? (
              <button
                onClick={handlePortal}
                disabled={loading}
                className="flex-1 bg-gray-900 text-white px-5 py-3 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {loading ? t('openingPortal') : t('portal')}
              </button>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                {t('subscribe')}
              </button>
            )}
          </div>

          {(status?.status === 'ACTIVE' || status?.status === 'TRIAL') && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">{t('cancelHowTitle')}</p>
              <p>1. {t('cancelStep1')}</p>
              <p>2. {t('cancelStep2')}</p>
              <p>3. {t('cancelStep3')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
