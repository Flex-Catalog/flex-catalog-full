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

  // Add affiliate form
  const [identifier, setIdentifier] = useState('');
  const [type, setType] = useState<'STANDARD' | 'PARTNER'>('STANDARD');
  const [adding, setAdding] = useState(false);

  const fetchAffiliates = async () => {
    try {
      const res = await api.get('/affiliates');
      setAffiliates(res.data);
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
      await api.post('/affiliates', { identifier: identifier.trim(), type });
      setIdentifier('');
      setType('STANDARD');
      setSuccess(ta('addSuccess'));
      await fetchAffiliates();
    } catch (err: any) {
      setError(err.response?.data?.message || ta('addError'));
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="p-6">{t('common.loading')}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{ta('settingsTitle')}</h1>
      <p className="text-gray-500 mb-6">{ta('settingsDescription')}</p>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-200 mb-4">
          {success}
        </div>
      )}

      {/* Current affiliates */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{ta('linkedAffiliates')}</h2>
        </div>

        {affiliates.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            {ta('noAffiliates')}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {affiliates.map((ta_item) => (
              <div key={ta_item.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {ta_item.affiliate.name || ta_item.affiliate.email}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ta_item.affiliate.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {ta_item.affiliate.status === 'ACTIVE' ? ta('statusActive') : ta('statusPending')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {ta_item.affiliate.email}
                    {ta_item.affiliate.cpf && ` | CPF: ${ta_item.affiliate.cpf}`}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    ta_item.type === 'PARTNER'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {ta_item.type === 'PARTNER' ? ta('typePartner') : ta('typeStandard')}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    {ta('commission')}: {ta_item.commissionPercent}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add affiliate form (only if under limit) */}
      {affiliates.length < 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">{ta('addAffiliate')}</h2>
          <p className="text-sm text-gray-500 mb-4">{ta('addDescription')}</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {ta('identifier')}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={ta('identifierPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {ta('affiliateType')}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'STANDARD' | 'PARTNER')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="STANDARD">{ta('typeStandard')} (10%)</option>
                <option value="PARTNER">{ta('typePartner')} (40%)</option>
              </select>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              {ta('permanentWarning')}
            </div>

            <button
              onClick={handleAdd}
              disabled={adding || !identifier.trim()}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {adding ? t('common.saving') : ta('addAffiliate')}
            </button>
          </div>
        </div>
      )}

      {affiliates.length >= 2 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-600">
          {ta('maxReached')}
        </div>
      )}
    </div>
  );
}
