'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

interface DocumentSettings {
  showClientTaxId: boolean;
  showBoatName: boolean;
  showPaymentTerms: boolean;
  showSignatureLine: boolean;
  showObservations: boolean;
  showClientAddress: boolean;
}

const SETTING_KEYS: (keyof DocumentSettings)[] = [
  'showClientTaxId',
  'showBoatName',
  'showPaymentTerms',
  'showSignatureLine',
  'showObservations',
  'showClientAddress',
];

export default function DocumentSettingsPage() {
  const t = useTranslations('settings');
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery<DocumentSettings>({
    queryKey: ['document-settings'],
    queryFn: async () => {
      const res = await api.get('/tenants/document-settings');
      return res.data;
    },
  });

  const [local, setLocal] = useState<DocumentSettings | null>(null);
  const current = local ?? settings ?? null;

  const saveMutation = useMutation({
    mutationFn: async (data: DocumentSettings) => {
      const res = await api.patch('/tenants/document-settings', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleToggle = (key: keyof DocumentSettings) => {
    const base = current ?? ({} as DocumentSettings);
    setLocal({ ...base, [key]: !base[key] });
  };

  const handleSave = () => {
    if (current) saveMutation.mutate(current);
  };

  if (isLoading || !current) {
    return <div className="text-gray-500">{t('loading')}</div>;
  }

  const labelMap: Record<keyof DocumentSettings, string> = {
    showClientTaxId: t('docShowClientTaxId'),
    showBoatName: t('docShowBoatName'),
    showPaymentTerms: t('docShowPaymentTerms'),
    showSignatureLine: t('docShowSignatureLine'),
    showObservations: t('docShowObservations'),
    showClientAddress: t('docShowClientAddress'),
  };

  const descMap: Record<keyof DocumentSettings, string> = {
    showClientTaxId: t('docShowClientTaxIdDesc'),
    showBoatName: t('docShowBoatNameDesc'),
    showPaymentTerms: t('docShowPaymentTermsDesc'),
    showSignatureLine: t('docShowSignatureLineDesc'),
    showObservations: t('docShowObservationsDesc'),
    showClientAddress: t('docShowClientAddressDesc'),
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('docTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('docDesc')}</p>
      </div>

      {saved && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">
          {t('savedSuccess')}
        </div>
      )}

      {saveMutation.isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {t('saveError')}
        </div>
      )}

      {/* Service Order / Receipt settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-1">{t('docSectionReceipt')}</h2>
        <p className="text-xs text-gray-500 mb-4">{t('docSectionReceiptDesc')}</p>
        <div className="space-y-3">
          {(['showClientTaxId', 'showBoatName', 'showPaymentTerms', 'showSignatureLine'] as const).map((key) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-800">{labelMap[key]}</p>
                <p className="text-xs text-gray-400">{descMap[key]}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  current[key] ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    current[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* NFS-e settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">{t('docSectionNfse')}</h2>
        <p className="text-xs text-gray-500 mb-4">{t('docSectionNfseDesc')}</p>
        <div className="space-y-3">
          {(['showObservations', 'showClientAddress'] as const).map((key) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-800">{labelMap[key]}</p>
                <p className="text-xs text-gray-400">{descMap[key]}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  current[key] ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    current[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {saveMutation.isPending ? t('saving') : t('save')}
      </button>
    </div>
  );
}
