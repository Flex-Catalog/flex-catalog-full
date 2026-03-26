'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useState, useRef } from 'react';

interface ProductForm {
  name: string;
  sku: string;
  priceCents: number;
  costCents: number | null;
  currency: string;
  stockQuantity: number;
  stockMinAlert: number | null;
  categoryId?: string;
  isActive: boolean;
  attributes: { key: string; value: string }[];
  // Fiscal
  ncm: string;
  cfop: string;
  icmsSituacaoTributaria: string;
  icmsOrigem: string;
  pisSituacaoTributaria: string;
  cofinsSituacaoTributaria: string;
}

export default function NewProductPage() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [ncmSearch, setNcmSearch] = useState('');
  const [ncmResults, setNcmResults] = useState<Array<{ code: string; description: string }>>([]);
  const [ncmLoading, setNcmLoading] = useState(false);
  const ncmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { register, handleSubmit, setValue, control, watch, formState: { errors } } = useForm<ProductForm>({
    defaultValues: {
      name: '',
      sku: '',
      priceCents: 0,
      costCents: null,
      currency: 'BRL',
      stockQuantity: 0,
      stockMinAlert: null,
      isActive: true,
      attributes: [],
      ncm: '',
      cfop: '',
      icmsSituacaoTributaria: '',
      icmsOrigem: '0',
      pisSituacaoTributaria: '',
      cofinsSituacaoTributaria: '',
    },
  });

  const watchedPrice = watch('priceCents');
  const watchedCost = watch('costCents');

  const marginPercent =
    watchedCost != null && watchedPrice > 0
      ? (((watchedPrice - watchedCost) / watchedPrice) * 100)
      : null;

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

  const { fields, append, remove } = useFieldArray({ control, name: 'attributes' });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const attributes: Record<string, any> = {};
      data.attributes.forEach(attr => {
        if (attr.key) {
          const numValue = parseFloat(attr.value);
          attributes[attr.key] = !isNaN(numValue) ? numValue : attr.value;
        }
      });

      const fiscal: Record<string, unknown> = {};
      if (data.ncm) fiscal.ncm = data.ncm;
      if (data.cfop) fiscal.cfop = data.cfop;
      if (data.icmsSituacaoTributaria) fiscal.icmsSituacaoTributaria = data.icmsSituacaoTributaria;
      if (data.icmsOrigem !== '' && data.icmsOrigem !== undefined) fiscal.icmsOrigem = Number(data.icmsOrigem);
      if (data.pisSituacaoTributaria) fiscal.pisSituacaoTributaria = data.pisSituacaoTributaria;
      if (data.cofinsSituacaoTributaria) fiscal.cofinsSituacaoTributaria = data.cofinsSituacaoTributaria;

      const res = await api.post('/products', {
        name: data.name,
        sku: data.sku || undefined,
        priceCents: Math.round(data.priceCents * 100),
        costCents: data.costCents != null ? Math.round(data.costCents * 100) : undefined,
        currency: data.currency,
        stockQuantity: data.stockQuantity ?? 0,
        stockMinAlert: data.stockMinAlert != null && data.stockMinAlert >= 0 ? data.stockMinAlert : undefined,
        attributes,
        categoryId: data.categoryId || undefined,
        isActive: data.isActive,
        fiscal: Object.keys(fiscal).length > 0 ? fiscal : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push('/app/products');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('common.error'));
    },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('products.create')}</h1>
        <Link href="/app/products" className="text-gray-600 hover:text-gray-800">
          {t('common.back')}
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit((d) => { setError(''); createMutation.mutate(d); })} className="space-y-6 bg-white p-6 rounded-lg shadow">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.name')} *</label>
          <input
            {...register('name', { required: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('products.namePlaceholder')}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{t('validation.required')}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
          <input
            {...register('sku')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="SKU-001"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.price')} *</label>
            <input
              type="number"
              step="0.01"
              {...register('priceCents', { required: true, min: 0, valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
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

        {/* Estoque e Custos */}
        <div className="border border-blue-100 rounded-lg p-4 bg-blue-50">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">{t('products.stockSection')}</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.cost')}</label>
              <input
                type="number"
                step="0.01"
                {...register('costCents', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">{t('products.costDesc')}</p>
            </div>
            <div className="flex flex-col justify-center">
              {marginPercent != null ? (
                <div className={`rounded-lg p-3 text-center ${marginPercent < 0 ? 'bg-red-100 text-red-700' : marginPercent < 20 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  <div className="text-xs font-medium">{t('products.margin')}</div>
                  <div className="text-2xl font-bold">{marginPercent.toFixed(1)}%</div>
                  {marginPercent < 20 && marginPercent >= 0 && <div className="text-xs mt-1">{t('products.marginAlert')}</div>}
                  {marginPercent < 0 && <div className="text-xs mt-1">{t('products.marginNegative')}</div>}
                </div>
              ) : (
                <div className="rounded-lg p-3 text-center bg-gray-100 text-gray-400">
                  <div className="text-xs">{t('products.margin')}</div>
                  <div className="text-sm">—</div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.initialStock')}</label>
              <input
                type="number"
                step="1"
                min="0"
                {...register('stockQuantity', { valueAsNumber: true, min: 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.stockMinAlert')}</label>
              <input
                type="number"
                step="1"
                min="0"
                {...register('stockMinAlert', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">{t('products.stockMinAlertDesc')}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.category')}</label>
          <select
            {...register('categoryId')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('products.noCategory')}</option>
            {categoriesData?.data?.map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">{t('products.attributes')}</label>
            <button type="button" onClick={() => append({ key: '', value: '' })} className="text-blue-600 hover:text-blue-800 text-sm">
              + {t('products.addAttribute')}
            </button>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 mb-2">
              <input
                {...register(`attributes.${index}.key`)}
                placeholder={t('products.attributeKey')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                {...register(`attributes.${index}.value`)}
                placeholder={t('products.attributeValue')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
              <button type="button" onClick={() => remove(index)} className="text-red-600 hover:text-red-800 px-2">X</button>
            </div>
          ))}
        </div>

        <div className="flex items-center">
          <input type="checkbox" {...register('isActive')} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
          <label className="ml-2 block text-sm text-gray-700">{t('products.active')}</label>
        </div>

        {/* Fiscal Codes */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('products.fiscalCodesTitle')}</h3>
          <p className="text-xs text-gray-500 mb-3">{t('products.fiscalCodesDesc')}</p>
          <div className="grid grid-cols-2 gap-4">
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
                {ncmLoading && <span className="absolute right-3 top-2 text-xs text-gray-400">buscando...</span>}
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
              <p className="text-xs text-gray-400 mt-1">8 dígitos. Consulte a TIPI/IBPT. Campo obrigatório na NF-e.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CFOP</label>
              <input {...register('cfop')} placeholder="Ex: 5102" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ICMS — Situação Tributária (CST/CSOSN)</label>
              <input {...register('icmsSituacaoTributaria')} placeholder="Ex: 102 (Simples) ou 40 (Isento)" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
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
              <input {...register('pisSituacaoTributaria')} placeholder="Ex: 07 (Operação Isenta)" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">COFINS — Situação Tributária (CST)</label>
              <input {...register('cofinsSituacaoTributaria')} placeholder="Ex: 07 (Operação Isenta)" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? t('common.saving') : t('common.save')}
          </button>
          <Link href="/app/products" className="flex-1 text-center bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300">
            {t('common.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}
