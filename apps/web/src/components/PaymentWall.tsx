'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { api } from '@/lib/api';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
);

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations('paymentWall');
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    try {
      // Confirm the SetupIntent with Payment Elements
      const { error: setupError } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (setupError) {
        setError(setupError.message || t('paymentFailed'));
        setLoading(false);
        return;
      }

      // SetupIntent succeeded — now create the subscription
      const res = await api.post('/billing/subscribe');

      if (res.data.clientSecret) {
        // If subscription requires payment confirmation (e.g. first invoice)
        const { error: payError } = await stripe.confirmPayment({
          clientSecret: res.data.clientSecret,
          redirect: 'if_required',
        });

        if (payError) {
          setError(payError.message || t('paymentFailed'));
          setLoading(false);
          return;
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || t('paymentFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-100">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t('processing')}
          </>
        ) : (
          t('subscribe')
        )}
      </button>
    </form>
  );
}

interface PaymentWallProps {
  tenantStatus: string;
  onSuccess: () => void;
  onLogout: () => void;
}

export function PaymentWall({ tenantStatus, onSuccess, onLogout }: PaymentWallProps) {
  const t = useTranslations('paymentWall');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .post('/billing/setup-intent')
      .then((res) => {
        setClientSecret(res.data.clientSecret);
      })
      .catch((err) => {
        setError(err.response?.data?.message || t('setupError'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  const statusConfig: Record<string, { icon: string; color: string; bgColor: string; borderColor: string }> = {
    PAST_DUE: {
      icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    CANCELED: {
      icon: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    PENDING_PAYMENT: {
      icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
  };

  const config = statusConfig[tenantStatus] || statusConfig.PENDING_PAYMENT;

  const statusMessage: Record<string, string> = {
    PAST_DUE: t('pastDueMessage'),
    CANCELED: t('canceledMessage'),
    PENDING_PAYMENT: t('pendingMessage'),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 font-sans antialiased">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Flex<span className="text-blue-600">Catalog</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          {/* Status banner */}
          <div className={`${config.bgColor} ${config.borderColor} border-b px-6 py-4`}>
            <div className="flex items-center gap-3">
              <svg className={`w-6 h-6 ${config.color} flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
              </svg>
              <div>
                <h2 className={`font-semibold ${config.color}`}>{t('title')}</h2>
                <p className={`text-sm ${config.color} opacity-80`}>
                  {statusMessage[tenantStatus] || t('pendingMessage')}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Plan info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">FlexCatalog Pro</span>
                <span className="text-2xl font-bold text-gray-900">
                  {t('price')}<span className="text-sm font-normal text-gray-500">/{t('perMonth')}</span>
                </span>
              </div>
              <ul className="space-y-1.5">
                {[t('feature1'), t('feature2'), t('feature3')].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment form */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  {t('tryAgain')}
                </button>
              </div>
            ) : clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#2563eb',
                      borderRadius: '12px',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    },
                  },
                }}
              >
                <PaymentForm onSuccess={onSuccess} />
              </Elements>
            ) : null}

            {/* Secure badge */}
            <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              {t('securedByStripe')}
            </div>
          </div>
        </div>

        {/* Logout link */}
        <div className="text-center mt-6">
          <button
            onClick={onLogout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t('logoutLink')}
          </button>
        </div>
      </div>
    </div>
  );
}
