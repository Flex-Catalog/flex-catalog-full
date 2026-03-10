'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';

interface ClientForm {
  name: string;
  tradeName: string;
  taxId: string;
  email: string;
  phone: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  notes: string;
}

export default function NewClientPage() {
  const t = useTranslations();
  const router = useRouter();
  const { locale } = useParams() as { locale: string };
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [lookupMsg, setLookupMsg] = useState('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ClientForm>();

  const taxIdValue = watch('taxId', '');
  const cepValue = watch('cep', '');

  const handleCnpjLookup = async () => {
    const cnpj = taxIdValue.replace(/\D/g, '');
    if (cnpj.length !== 14) {
      setLookupMsg(t('clients.cnpjInvalidLength'));
      return;
    }
    setCnpjLoading(true);
    setLookupMsg('');
    try {
      const res = await api.get(`/clients/lookup/cnpj/${cnpj}`);
      const d = res.data;
      if (d.name) setValue('name', d.name);
      if (d.tradeName) setValue('tradeName', d.tradeName);
      if (d.phone) setValue('phone', d.phone);
      if (d.email) setValue('email', d.email);
      if (d.logradouro) setValue('logradouro', d.logradouro);
      if (d.numero) setValue('numero', d.numero);
      if (d.complemento) setValue('complemento', d.complemento);
      if (d.bairro) setValue('bairro', d.bairro);
      if (d.municipio) setValue('municipio', d.municipio);
      if (d.uf) setValue('uf', d.uf);
      if (d.cep) setValue('cep', d.cep.replace(/(\d{5})(\d{3})/, '$1-$2'));
      setLookupMsg(t('clients.cnpjFillSuccess'));
    } catch (err: any) {
      setLookupMsg(err.response?.data?.message || t('clients.cnpjLookupError'));
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleCepLookup = async () => {
    const cep = cepValue.replace(/\D/g, '');
    if (cep.length !== 8) {
      setLookupMsg(t('clients.cepInvalidLength'));
      return;
    }
    setCepLoading(true);
    setLookupMsg('');
    try {
      const res = await api.get(`/clients/lookup/cep/${cep}`);
      const d = res.data;
      if (d.logradouro) setValue('logradouro', d.logradouro);
      if (d.complemento) setValue('complemento', d.complemento);
      if (d.bairro) setValue('bairro', d.bairro);
      if (d.municipio) setValue('municipio', d.municipio);
      if (d.uf) setValue('uf', d.uf);
      setLookupMsg(t('clients.cepFillSuccess'));
    } catch (err: any) {
      setLookupMsg(err.response?.data?.message || t('clients.cepLookupError'));
    } finally {
      setCepLoading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (formData: ClientForm) => {
      const res = await api.post('/clients', {
        name: formData.name,
        tradeName: formData.tradeName || undefined,
        taxId: formData.taxId || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        logradouro: formData.logradouro || undefined,
        numero: formData.numero || undefined,
        complemento: formData.complemento || undefined,
        bairro: formData.bairro || undefined,
        municipio: formData.municipio || undefined,
        uf: formData.uf || undefined,
        cep: formData.cep || undefined,
        notes: formData.notes || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      router.push(`/${locale}/app/clients`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.response?.data?.error?.message || t('common.error'));
    },
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('clients.create')}</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>
      )}
      {lookupMsg && (
        <div className={`px-4 py-2 rounded mb-3 text-sm ${lookupMsg.includes('sucesso') || lookupMsg.includes('preenchido') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
          {lookupMsg}
        </div>
      )}

      <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-5">

        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">{t('clients.identification')}</h2>

          {/* CNPJ row with lookup button */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('clients.taxId')} (CNPJ/CPF)</label>
            <div className="flex gap-2">
              <input
                {...register('taxId')}
                placeholder="00.000.000/0001-00"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button
                type="button"
                onClick={handleCnpjLookup}
                disabled={cnpjLoading}
                className="px-3 py-2 bg-blue-50 border border-blue-300 text-blue-700 rounded-md text-sm hover:bg-blue-100 disabled:opacity-50 whitespace-nowrap"
              >
                {cnpjLoading ? '...' : t('clients.lookupCnpj')}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Consulta automática na Receita Federal via BrasilAPI</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('clients.name')} *</label>
              <input
                {...register('name', { required: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{t('validation.required')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('clients.tradeName')}</label>
              <input {...register('tradeName')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('clients.email')}</label>
              <input {...register('email')} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('clients.phone')}</label>
              <input {...register('phone')} placeholder="(00) 00000-0000" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">{t('clients.address')}</h2>

          {/* CEP with lookup */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.cep')}</label>
              <div className="flex gap-2">
                <input
                  {...register('cep')}
                  placeholder="00000-000"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <button
                  type="button"
                  onClick={handleCepLookup}
                  disabled={cepLoading}
                  className="px-2 py-1 bg-blue-50 border border-blue-300 text-blue-700 rounded-md text-xs hover:bg-blue-100 disabled:opacity-50 whitespace-nowrap"
                >
                  {cepLoading ? '...' : t('common.search')}
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.uf')}</label>
              <input {...register('uf')} maxLength={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm uppercase" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.logradouro')}</label>
              <input {...register('logradouro')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.numero')}</label>
              <input {...register('numero')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.complemento')}</label>
              <input {...register('complemento')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.bairro')}</label>
              <input {...register('bairro')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div className="col-span-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.municipio')}</label>
              <input {...register('municipio')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('clients.notes')}</label>
          <textarea {...register('notes')} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {createMutation.isPending ? t('common.saving') : t('common.save')}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/app/clients`)}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
