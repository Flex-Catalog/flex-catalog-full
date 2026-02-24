'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

interface TenantAffiliate {
  id: string;
  type: string;
  commissionPercent: number;
  linkedAt: string;
  affiliate: {
    id: string;
    email: string;
    name: string | null;
    cpf: string | null;
    status: string;
  };
}

export default function AffiliatesSettingsPage() {
  const t = useTranslations();
  const ta = useTranslations('affiliate');

  const [affiliates, setAffiliates] = useState<TenantAffiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [identifier, setIdentifier] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchAffiliates = async () => {
    try {
      const res = await api.get('/affiliates');
      setAffiliates(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setError(ta('loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const handleAdd = async () => {
    if (!identifier.trim()) return;
    setAdding(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/affiliates', { identifier: identifier.trim(), type: 'STANDARD' });
      setIdentifier('');
      setSuccess(ta('addSuccess'));
      await fetchAffiliates();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || ta('addError'));
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{ta('settingsTitle')}</h1>
      <p className="text-gray-500 mb-6">{ta('settingsDescription')}</p>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-100 mb-4">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-xl text-sm border border-green-100 mb-4">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          {success}
        </div>
      )}

      {/* Current affiliates */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{ta('linkedAffiliates')}</h2>
        </div>

        {affiliates.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {ta('noAffiliates')}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {affiliates.map((item) => (
              <div key={item.id} className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {(item.affiliate.name || item.affiliate.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {item.affiliate.name || item.affiliate.email}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.affiliate.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.affiliate.status === 'ACTIVE' ? ta('statusActive') : ta('statusPending')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {item.affiliate.email}
                      {item.affiliate.cpf && ` | CPF: ${item.affiliate.cpf}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    item.type === 'PARTNER'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.type === 'PARTNER' ? ta('typePartner') : ta('typeStandard')}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    {ta('commission')}: {item.commissionPercent}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add affiliate form (only if under limit) */}
      {affiliates.length < 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">{ta('addAffiliate')}</h2>
          <p className="text-sm text-gray-500 mb-4">{ta('addDescription')}</p>
          <p className="text-xs text-gray-400 mb-4">{ta('autoStandard')}</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {ta('identifier')}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={ta('identifierPlaceholder')}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white text-sm"
              />
            </div>

            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              {ta('permanentWarning')}
            </div>

            <button
              onClick={handleAdd}
              disabled={adding || !identifier.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-600/20"
            >
              {adding ? t('common.saving') : ta('addAffiliate')}
            </button>
          </div>
        </div>
      )}

      {affiliates.length >= 2 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-500">
          {ta('maxReached')}
        </div>
      )}
    </div>
  );
}
