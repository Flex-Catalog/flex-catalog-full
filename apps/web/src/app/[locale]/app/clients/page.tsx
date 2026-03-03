'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Client {
  id: string;
  name: string;
  tradeName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  notes: string | null;
  isActive: boolean;
}

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
  isActive: boolean;
}

export default function ClientsPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { locale } = useParams() as { locale: string };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset, setValue, watch } = useForm<ClientForm>();
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [lookupMsg, setLookupMsg] = useState('');
  const taxIdValue = watch('taxId', '');
  const cepValue = watch('cep', '');

  const handleCnpjLookup = async () => {
    const cnpj = (taxIdValue ?? '').replace(/\D/g, '');
    if (cnpj.length !== 14) { setLookupMsg('CNPJ precisa ter 14 dígitos'); return; }
    setCnpjLoading(true); setLookupMsg('');
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
      setLookupMsg('Dados preenchidos!');
    } catch (err: any) { setLookupMsg(err.response?.data?.message || 'CNPJ não encontrado.'); }
    finally { setCnpjLoading(false); }
  };

  const handleCepLookup = async () => {
    const cep = (cepValue ?? '').replace(/\D/g, '');
    if (cep.length !== 8) { setLookupMsg('CEP precisa ter 8 dígitos'); return; }
    setCepLoading(true); setLookupMsg('');
    try {
      const res = await api.get(`/clients/lookup/cep/${cep}`);
      const d = res.data;
      if (d.logradouro) setValue('logradouro', d.logradouro);
      if (d.complemento) setValue('complemento', d.complemento);
      if (d.bairro) setValue('bairro', d.bairro);
      if (d.municipio) setValue('municipio', d.municipio);
      if (d.uf) setValue('uf', d.uf);
      setLookupMsg('Endereço preenchido!');
    } catch (err: any) { setLookupMsg(err.response?.data?.message || 'CEP não encontrado.'); }
    finally { setCepLoading(false); }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });

  const clients: Client[] = data?.data ?? [];
  const filtered = search
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.tradeName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (c.taxId ?? '').includes(search),
      )
    : clients;

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const res = await api.patch(`/clients/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
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
      await api.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setError('');
    setLookupMsg('');
    reset({
      name: c.name,
      tradeName: c.tradeName ?? '',
      taxId: c.taxId ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      logradouro: c.logradouro ?? '',
      numero: c.numero ?? '',
      complemento: c.complemento ?? '',
      bairro: c.bairro ?? '',
      municipio: c.municipio ?? '',
      uf: c.uf ?? '',
      cep: c.cep ?? '',
      notes: c.notes ?? '',
      isActive: c.isActive,
    });
  };

  if (isLoading) return <div className="text-gray-500">{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('clients.title')}</h1>
        <Link
          href={`/${locale}/app/clients/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
        >
          + {t('clients.create')}
        </Link>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('clients.searchPlaceholder')}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {t('clients.noClients')}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('clients.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('clients.tradeName')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('clients.taxId')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('clients.phone')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('clients.municipio')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('clients.isActive')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.tradeName ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{c.taxId ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.municipio ? `${c.municipio}/${c.uf ?? ''}` : '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.isActive ? t('common.yes') : t('common.no')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm space-x-3">
                    <button onClick={() => openEdit(c)} className="text-blue-600 hover:text-blue-800 font-medium">
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => { if (confirm(t('common.confirmDelete'))) deleteMutation.mutate(c.id); }}
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
            <h2 className="text-lg font-bold mb-4">{t('clients.edit')}</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>
            )}
            {lookupMsg && (
              <div className={`px-3 py-2 rounded mb-3 text-xs ${lookupMsg.includes('preenchido') || lookupMsg.includes('Dados') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                {lookupMsg}
              </div>
            )}

            <form onSubmit={handleSubmit((body) => updateMutation.mutate({ id: editingId, body }))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('clients.name')} *</label>
                  <input {...register('name', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.tradeName')}</label>
                  <input {...register('tradeName')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.taxId')}</label>
                  <div className="flex gap-1">
                    <input {...register('taxId')} className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" />
                    <button type="button" onClick={handleCnpjLookup} disabled={cnpjLoading} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs hover:bg-blue-100 disabled:opacity-50">
                      {cnpjLoading ? '...' : 'RFB'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.email')}</label>
                  <input {...register('email')} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.phone')}</label>
                  <input {...register('phone')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase">{t('clients.address')}</h3>
                <div className="grid grid-cols-4 gap-3">
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
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.municipio')}</label>
                    <input {...register('municipio')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.uf')}</label>
                    <input {...register('uf')} maxLength={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.cep')}</label>
                    <div className="flex gap-1">
                      <input {...register('cep')} className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" />
                      <button type="button" onClick={handleCepLookup} disabled={cepLoading} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs hover:bg-blue-100 disabled:opacity-50">
                        {cepLoading ? '...' : 'CEP'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('clients.notes')}</label>
                <textarea {...register('notes')} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" {...register('isActive')} id="clientIsActive" className="rounded" />
                <label htmlFor="clientIsActive" className="text-sm font-medium text-gray-700">{t('clients.isActive')}</label>
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
