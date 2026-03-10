'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';

interface ProductForm {
  name: string;
  sku: string;
  priceCents: number;
  currency: string;
  categoryId: string;
  isActive: boolean;
  // Fiscal codes
  ncm: string;
  cfop: string;
  icmsSituacaoTributaria: string;
  icmsOrigem: string;
  pisSituacaoTributaria: string;
  cofinsSituacaoTributaria: string;
}

export default function ProductEditPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const { locale, id } = params as { locale: string; id: string };
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [ncmSearch, setNcmSearch] = useState('');
  const [ncmResults, setNcmResults] = useState<Array<{ code: string; description: string }>>([]);
  const [ncmLoading, setNcmLoading] = useState(false);
  const ncmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<ProductForm>();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then((r) => r.data),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
  const categories: Array<{ id: string; name: string }> = categoriesData?.data ?? [];

  useEffect(() => {
    if (product) {
      const fiscal = product.fiscal ?? {};
      reset({
        name: product.name ?? '',
        sku: product.sku ?? '',
        priceCents: product.priceCents != null ? product.priceCents / 100 : 0,
        currency: product.currency ?? 'BRL',
        categoryId: product.categoryId ?? '',
        isActive: product.isActive ?? true,
        ncm: fiscal.ncm ?? product.ncm ?? '',
        cfop: fiscal.cfop ?? product.cfop ?? '',
        icmsSituacaoTributaria: fiscal.icmsSituacaoTributaria ?? product.icmsSituacaoTributaria ?? '',
        icmsOrigem: String(fiscal.icmsOrigem ?? product.icmsOrigem ?? '0'),
        pisSituacaoTributaria: fiscal.pisSituacaoTributaria ?? product.pisSituacaoTributaria ?? '',
        cofinsSituacaoTributaria: fiscal.cofinsSituacaoTributaria ?? product.cofinsSituacaoTributaria ?? '',
      });
      const ncmCode = fiscal.ncm ?? product.ncm ?? '';
      if (ncmCode) setNcmSearch(ncmCode);
    }
  }, [product, reset]);

  const handleNcmSearch = (q: string) => {
    setNcmSearch(q);
    if (ncmTimer.current) clearTimeout(ncmTimer.current);
    if (q.trim().length < 2) { setNcmResults([]); return; }
    ncmTimer.current = setTimeout(async () => {
      setNcmLoading(true);
      try {
        const res = await api.get(`/clients/lookup/ncm?q=${encodeURIComponent(q)}`);
        setNcmResults(res.data ?? []);
      } catch { setNcmResults([]); }
      finally { setNcmLoading(false); }
    }, 400);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const fiscal: Record<string, unknown> = {};
      if (data.ncm) fiscal.ncm = data.ncm;
      if (data.cfop) fiscal.cfop = data.cfop;
      if (data.icmsSituacaoTributaria) fiscal.icmsSituacaoTributaria = data.icmsSituacaoTributaria;
      if (data.icmsOrigem !== '' && data.icmsOrigem !== undefined) fiscal.icmsOrigem = Number(data.icmsOrigem);
      if (data.pisSituacaoTributaria) fiscal.pisSituacaoTributaria = data.pisSituacaoTributaria;
      if (data.cofinsSituacaoTributaria) fiscal.cofinsSituacaoTributaria = data.cofinsSituacaoTributaria;

      const res = await api.patch(`/products/${id}`, {
        name: data.name,
        sku: data.sku || undefined,
        priceCents: Math.round(data.priceCents * 100),
        currency: data.currency,
        categoryId: data.categoryId || undefined,
        isActive: data.isActive,
        fiscal: Object.keys(fiscal).length > 0 ? fiscal : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('common.error'));
    },
  });

  if (isLoading) return <div className="text-gray-500">{t('common.loading')}</div>;
  if (!product) return <div className="text-red-500">{t('products.notFound')}</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('products.edit')}</h1>
        <button
          onClick={() => router.push(`/${locale}/app/products`)}
          className="text-gray-600 hover:text-gray-800 text-sm"
        >
          {t('common.back')}
        </button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
      {saved && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">{t('common.savedSuccess')}</div>}

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6 bg-white p-6 rounded-lg shadow">

        {/* Basic Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.name')} *</label>
          <input
            {...register('name', { required: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{t('validation.required')}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
          <input {...register('sku')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.price')} *</label>
            <input
              type="number"
              step="0.01"
              {...register('priceCents', { required: true, min: 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.currency')}</label>
            <select {...register('currency')} className="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.category')}</label>
          <select {...register('categoryId')} className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="">{t('products.noCategory')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" {...register('isActive')} id="isActive" className="rounded" />
          <label htmlFor="isActive" className="text-sm text-gray-700">{t('products.active')}</label>
        </div>

        {/* Fiscal Codes */}
        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('products.fiscalCodesTitle')}</h3>
          <p className="text-xs text-gray-500 mb-4">{t('products.fiscalCodesDesc')}</p>

          <div className="grid grid-cols-2 gap-4">
            {/* NCM with live search */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">NCM — Nomenclatura Comum do Mercosul</label>
              <div className="relative">
                <input
                  value={ncmSearch}
                  onChange={(e) => handleNcmSearch(e.target.value)}
                  placeholder="Digite descrição ou código NCM (ex: 84713012)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  autoComplete="off"
                />
                {ncmLoading && <span className="absolute right-3 top-2.5 text-xs text-gray-400">buscando...</span>}
                {ncmResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {ncmResults.map((n) => (
                      <button
                        key={n.code}
                        type="button"
                        onMouseDown={() => {
                          setValue('ncm', n.code);
                          setNcmSearch(`${n.code} — ${n.description}`);
                          setNcmResults([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs border-b border-gray-100 last:border-0"
                      >
                        <span className="font-mono font-bold">{n.code}</span>
                        <span className="text-gray-600 ml-2">{n.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input {...register('ncm')} type="hidden" />
              <p className="text-xs text-gray-400 mt-1">Busca na tabela TIPI/BrasilAPI. 8 dígitos, obrigatório na NF-e.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CFOP</label>
              <input {...register('cfop')} placeholder="Ex: 5102" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              <p className="text-xs text-gray-400 mt-1">Código Fiscal de Operações e Prestações</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ICMS — Situação Tributária (CST/CSOSN)</label>
              <input {...register('icmsSituacaoTributaria')} placeholder="Ex: 102 ou 40" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ICMS Origem</label>
              <select {...register('icmsOrigem')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="0">0 — Nacional</option>
                <option value="1">1 — Estrangeira (importação direta)</option>
                <option value="2">2 — Estrangeira (adq. mercado interno)</option>
                <option value="3">3 — Nacional c/ mais de 40% conteúdo importado</option>
                <option value="4">4 — Nacional (processos produtivos básicos)</option>
                <option value="5">5 — Nacional c/ menos de 40% conteúdo importado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">PIS — Situação Tributária (CST)</label>
              <input {...register('pisSituacaoTributaria')} placeholder="Ex: 07" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">COFINS — Situação Tributária (CST)</label>
              <input {...register('cofinsSituacaoTributaria')} placeholder="Ex: 07" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? t('common.saving') : t('common.save')}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/app/products`)}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
