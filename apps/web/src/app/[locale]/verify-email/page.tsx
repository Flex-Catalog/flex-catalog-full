'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function VerifyEmailPage() {
  const t = useTranslations('landing.verifyEmail');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage(t('noToken'));
      return;
    }

    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err.response?.data?.message || t('failed'));
      });
  }, [token, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          FlexCatalog
        </Link>

        {status === 'loading' && (
          <div className="mt-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">{t('verifying')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-8">
            <div className="text-5xl mb-4">&#10003;</div>
            <h2 className="text-xl font-semibold text-green-600">{t('successTitle')}</h2>
            <p className="mt-2 text-gray-600">{t('successMessage')}</p>
            <Link
              href="/login"
              className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {t('goToLogin')}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-8">
            <div className="text-5xl mb-4 text-red-500">&#10007;</div>
            <h2 className="text-xl font-semibold text-red-600">{t('errorTitle')}</h2>
            <p className="mt-2 text-gray-600">{errorMessage}</p>
            <Link
              href="/login"
              className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {t('goToLogin')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
