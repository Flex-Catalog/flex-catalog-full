'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function BillingPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await api.post('/billing/checkout');
      window.location.href = res.data.url;
    } catch (err) {
      alert('Error creating checkout session');
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      const res = await api.post('/billing/portal');
      window.location.href = res.data.url;
    } catch (err) {
      alert('Error opening portal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t('billing.title')}</h1>
      <div className="bg-white p-6 rounded shadow">
        <p className="mb-4">{t('billing.required')}</p>
        <div className="flex gap-4">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {t('billing.subscribe')}
          </button>
          <button
            onClick={handlePortal}
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {t('billing.portal')}
          </button>
        </div>
      </div>
    </div>
  );
}
