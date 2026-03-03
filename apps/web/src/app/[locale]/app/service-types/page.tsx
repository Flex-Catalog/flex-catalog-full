'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface ServiceType {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  categoryId?: string | null;
  itemListaServico?: string;
  codigoTributacaoMunicipal?: string;
  aliquotaISS?: number;
  cnaeCode?: string;
  ncm?: string;
  cfop?: string;
  icmsSituacaoTributaria?: string;
  icmsOrigem?: number;
  pisSituacaoTributaria?: string;
  cofinsSituacaoTributaria?: string;
}

interface ServiceTypeForm {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  categoryId: string;
  itemListaServico: string;
  codigoTributacaoMunicipal: string;
  aliquotaISS: string;
  cnaeCode: string;
  ncm: string;
  cfop: string;
  icmsSituacaoTributaria: string;
}

export default function ServiceTypesPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { locale } = useParams() as { locale: string };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, setValue, watch } = useForm<ServiceTypeForm>();
  const nameValue = watch('name', '');

  const { data, isLoading } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => api.get('/service-types').then((r) => r.data),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
  const categories: Array<{ id: string; name: string }> = categoriesData?.data ?? [];

  const serviceTypes: ServiceType[] = data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<ServiceTypeForm> }) => {
      const res = await api.patch(`/service-types/${id}`, {
        ...body,
        aliquotaISS: body.aliquotaISS ? parseFloat(body.aliquotaISS) : undefined,
        categoryId: body.categoryId || null,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
      setEditingId(null);
      reset();
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.response?.data?.error?.message || t('common.error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/service-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || t('serviceTypes.deleteWarning'));
    },
  });

  const openEdit = (st: ServiceType) => {
    setEditingId(st.id);
    setError('');
    reset({
      name: st.name,
      code: st.code,
      description: st.description ?? '',
      isActive: st.isActive,
      categoryId: st.categoryId ?? '',
      itemListaServico: st.itemListaServico ?? '',
      codigoTributacaoMunicipal: st.codigoTributacaoMunicipal ?? '',
      aliquotaISS: st.aliquotaISS != null ? String(st.aliquotaISS) : '',
      cnaeCode: st.cnaeCode ?? '',
      ncm: st.ncm ?? '',
      cfop: st.cfop ?? '',
      icmsSituacaoTributaria: st.icmsSituacaoTributaria ?? '',
    });
  };

  const onSubmitEdit = (formData: ServiceTypeForm) => {
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, body: formData });
  };

  if (isLoading) return <div className="text-gray-500">{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('serviceTypes.title')}</h1>
        <Link
          href={`/${locale}/app/service-types/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
        >
          + {t('serviceTypes.create')}
        </Link>
      </div>

      {serviceTypes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {t('serviceTypes.noServiceTypes')}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('serviceTypes.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('serviceTypes.code')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('categories.title')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('serviceTypes.itemListaServico')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('serviceTypes.aliquotaISS')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('serviceTypes.isActive')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {serviceTypes.map((st) => (
                <tr key={st.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{st.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{st.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{categories.find((c) => c.id === st.categoryId)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{st.itemListaServico ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{st.aliquotaISS != null ? `${st.aliquotaISS}%` : '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {st.isActive ? t('common.yes') : t('common.no')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm space-x-3">
                    <button onClick={() => openEdit(st)} className="text-blue-600 hover:text-blue-800 font-medium">
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => { if (confirm(t('common.confirmDelete'))) deleteMutation.mutate(st.id); }}
                      className="text-red-600 hover:text-red-800"
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">{t('serviceTypes.edit')}</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceTypes.name')} *</label>
                  <input {...register('name', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceTypes.code')} *</label>
                  <input
                    {...register('code', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono uppercase"
                    onChange={(e) => setValue('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('serviceTypes.codeHelp')}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('serviceTypes.description')}</label>
                <textarea {...register('description')} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
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

              <div className="flex items-center gap-2">
                <input type="checkbox" {...register('isActive')} id="isActiveEdit" className="rounded" />
                <label htmlFor="isActiveEdit" className="text-sm font-medium text-gray-700">{t('serviceTypes.isActive')}</label>
              </div>

              {/* Fiscal Codes */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('serviceTypes.fiscalCodes')}</h3>
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

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {updateMutation.isPending ? t('common.saving') : t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingId(null); reset(); setError(''); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 text-sm"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
