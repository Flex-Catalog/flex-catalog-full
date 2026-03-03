'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';

interface ServiceTypeForm {
  name: string;
  code: string;
  description: string;
  categoryId: string;
  itemListaServico: string;
  codigoTributacaoMunicipal: string;
  aliquotaISS: string;
  cnaeCode: string;
  ncm: string;
  cfop: string;
  icmsSituacaoTributaria: string;
}

export default function NewServiceTypePage() {
  const t = useTranslations();
  const router = useRouter();
  const { locale } = useParams() as { locale: string };
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ServiceTypeForm>({
    defaultValues: { aliquotaISS: '5.00', categoryId: '' },
  });

  const nameValue = watch('name', '');

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
  const categories: Array<{ id: string; name: string }> = categoriesData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: async (formData: ServiceTypeForm) => {
      const res = await api.post('/service-types', {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        categoryId: formData.categoryId || undefined,
        itemListaServico: formData.itemListaServico || undefined,
        codigoTributacaoMunicipal: formData.codigoTributacaoMunicipal || undefined,
        aliquotaISS: formData.aliquotaISS ? parseFloat(formData.aliquotaISS) : undefined,
        cnaeCode: formData.cnaeCode || undefined,
        ncm: formData.ncm || undefined,
        cfop: formData.cfop || undefined,
        icmsSituacaoTributaria: formData.icmsSituacaoTributaria || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
      router.push(`/${locale}/app/service-types`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.response?.data?.error?.message || t('common.error'));
    },
  });

  const autoCode = (name: string) =>
    name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 50);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('serviceTypes.create')}</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-5">

        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Identificação</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceTypes.name')} *</label>
              <input
                {...register('name', { required: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                onChange={(e) => {
                  setValue('name', e.target.value);
                  setValue('code', autoCode(e.target.value));
                }}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{t('validation.required')}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceTypes.code')} *</label>
              <input
                {...register('code', { required: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono uppercase"
                onChange={(e) => setValue('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              />
              <p className="text-xs text-gray-400 mt-1">{t('serviceTypes.codeHelp')}</p>
              {errors.code && <p className="text-red-500 text-xs mt-1">{t('validation.required')}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceTypes.description')}</label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="Descrição opcional que aparece na NFS-e..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('categories.title')}</label>
            <select {...register('categoryId')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">— {t('products.noCategory')} —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fiscal Codes */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t('serviceTypes.fiscalCodes')}</h2>
            <p className="text-xs text-gray-500 mt-1">Estes códigos são usados na emissão da NFS-e e substituem os padrões da configuração fiscal.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('serviceTypes.itemListaServico')}</label>
              <input {...register('itemListaServico')} placeholder="Ex: 16.01" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              <p className="text-xs text-gray-400 mt-1">{t('serviceTypes.itemListaServicoHelp')}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('serviceTypes.aliquotaISS')}</label>
              <input {...register('aliquotaISS')} type="number" step="0.01" min="0" max="10" placeholder="5.00" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('serviceTypes.codigoTributacaoMunicipal')}</label>
              <input {...register('codigoTributacaoMunicipal')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('serviceTypes.cnaeCode')}</label>
              <input {...register('cnaeCode')} placeholder="Ex: 5091-2/01" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('serviceTypes.ncm')}</label>
              <input {...register('ncm')} placeholder="Ex: 84713012" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('serviceTypes.cfop')}</label>
              <input {...register('cfop')} placeholder="Ex: 5102" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('serviceTypes.icmsSituacaoTributaria')}</label>
              <input {...register('icmsSituacaoTributaria')} placeholder="Ex: 102 (Simples Nacional)" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
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
            onClick={() => router.push(`/${locale}/app/service-types`)}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
