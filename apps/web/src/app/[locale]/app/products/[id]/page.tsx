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
  costCents: number | null;
  currency: string;
  stockMinAlert: number | null;
  categoryId: string;
  isActive: boolean;
  ncm: string;
  cfop: string;
  icmsSituacaoTributaria: string;
  icmsOrigem: string;
  pisSituacaoTributaria: string;
  cofinsSituacaoTributaria: string;
}

type Tab = 'data' | 'history' | 'movements';

export default function ProductEditPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const { locale, id } = params as { locale: string; id: string };
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>('data');
  const [ncmSearch, setNcmSearch] = useState('');
  const [ncmResults, setNcmResults] = useState<Array<{ code: string; description: string }>>([]);
  const [ncmLoading, setNcmLoading] = useState(false);
  const ncmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [adjustSuccess, setAdjustSuccess] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<ProductForm>();

  const watchedPrice = watch('priceCents');
  const watchedCost = watch('costCents');
  const marginPercent =
    watchedCost != null && watchedPrice > 0
      ? (((watchedPrice - watchedCost) / watchedPrice) * 100)
      : null;

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

  const { data: priceHistory } = useQuery({
    queryKey: ['product-price-history', id],
    queryFn: () => api.get(`/products/${id}/price-history`).then((r) => r.data),
    enabled: tab === 'history',
  });

  const { data: stockMovements } = useQuery({
    queryKey: ['product-stock-movements', id],
    queryFn: () => api.get(`/products/${id}/stock-movements`).then((r) => r.data),
    enabled: tab === 'movements',
  });

  useEffect(() => {
    if (product) {
      const fiscal = product.fiscal ?? {};
      reset({
        name: product.name ?? '',
        sku: product.sku ?? '',
        priceCents: product.priceCents != null ? product.priceCents / 100 : 0,
        costCents: product.costCents != null ? product.costCents / 100 : null,
        currency: product.currency ?? 'BRL',
        stockMinAlert: product.stockMinAlert ?? null,
        categoryId: product.categoryId ?? '',
        isActive: product.isActive ?? true,
        ncm: fiscal.ncm ?? '',
        cfop: fiscal.cfop ?? '',
        icmsSituacaoTributaria: fiscal.icmsSituacaoTributaria ?? '',
        icmsOrigem: String(fiscal.icmsOrigem ?? '0'),
        pisSituacaoTributaria: fiscal.pisSituacaoTributaria ?? '',
        cofinsSituacaoTributaria: fiscal.cofinsSituacaoTributaria ?? '',
      });
      const ncmCode = fiscal.ncm ?? '';
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
      if (data.icmsOrigem !== '') fiscal.icmsOrigem = Number(data.icmsOrigem);
      if (data.pisSituacaoTributaria) fiscal.pisSituacaoTributaria = data.pisSituacaoTributaria;
      if (data.cofinsSituacaoTributaria) fiscal.cofinsSituacaoTributaria = data.cofinsSituacaoTributaria;

      const res = await api.patch(`/products/${id}`, {
        name: data.name,
        sku: data.sku || undefined,
        priceCents: Math.round(data.priceCents * 100),
        costCents: data.costCents != null ? Math.round(data.costCents * 100) : null,
        currency: data.currency,
        stockMinAlert: data.stockMinAlert != null ? Number(data.stockMinAlert) : null,
        categoryId: data.categoryId || undefined,
        isActive: data.isActive,
        fiscal: Object.keys(fiscal).length > 0 ? fiscal : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['product-price-history', id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('common.error'));
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async () => {
      const qty = parseInt(adjustQty, 10);
      if (isNaN(qty) || qty === 0) throw new Error('Quantidade inválida');
      const res = await api.post(`/products/${id}/stock/adjust`, {
        quantity: qty,
        reason: adjustReason || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stock-movements', id] });
      setAdjustSuccess(`Estoque atualizado: ${data.previousQty} → ${data.newQty}`);
      setAdjustQty('');
      setAdjustReason('');
      setAdjustError('');
      setTimeout(() => {
        setShowAdjustModal(false);
        setAdjustSuccess('');
      }, 1500);
    },
    onError: (err: any) => {
      setAdjustError(err.response?.data?.message || err.message || t('common.error'));
    },
  });

  if (isLoading) return <div className="text-gray-500">{t('common.loading')}</div>;
  if (!product) return <div className="text-red-500">{t('products.notFound')}</div>;

  const fmt = (cents: number | null, currency = 'BRL') =>
    cents == null ? '—' : `${currency} ${(cents / 100).toFixed(2)}`;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

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

      {/* Stock summary card */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-6">
        <div className="text-center">
          <div className="text-xs text-gray-500">{t('products.stockQty')}</div>
          <div className={`text-2xl font-bold ${product.stockQuantity === 0 ? 'text-red-600' : product.isLowStock ? 'text-yellow-600' : 'text-gray-900'}`}>
            {product.stockQuantity}
          </div>
          {product.stockQuantity === 0 && <div className="text-xs text-red-500">{t('products.outOfStock')}</div>}
          {product.stockQuantity > 0 && product.isLowStock && <div className="text-xs text-yellow-600">{t('products.lowStock')}</div>}
        </div>
        {product.marginPercent != null && (
          <div className="text-center">
            <div className="text-xs text-gray-500">{t('products.margin')}</div>
            <div className={`text-2xl font-bold ${product.marginPercent < 20 ? 'text-red-600' : product.marginPercent < 40 ? 'text-yellow-600' : 'text-green-600'}`}>
              {product.marginPercent.toFixed(1)}%
            </div>
          </div>
        )}
        <div className="ml-auto">
          <button
            onClick={() => { setShowAdjustModal(true); setAdjustError(''); setAdjustSuccess(''); }}
            className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            {t('products.adjustStock')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-4">
          {(['data', 'history', 'movements'] as Tab[]).map((t_) => (
            <button
              key={t_}
              onClick={() => setTab(t_)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${tab === t_ ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t_ === 'data' ? t('products.tabData') : t_ === 'history' ? t('products.priceHistory') : t('products.stockMovements')}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Data */}
      {tab === 'data' && (
        <>
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
          {saved && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">{t('common.savedSuccess')}</div>}

          <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6 bg-white p-6 rounded-lg shadow">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.name')} *</label>
              <input {...register('name', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
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
                  {...register('priceCents', { required: true, min: 0, valueAsNumber: true })}
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

            {/* Custo e Margem */}
            <div className="border border-blue-100 rounded-lg p-4 bg-blue-50">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">{t('products.stockSection')}</h3>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.cost')}</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('costCents', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.stockMinAlert')}</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  {...register('stockMinAlert', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">{t('products.stockMinAlertDesc')}</p>
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
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">NCM — Nomenclatura Comum do Mercosul</label>
                  <div className="relative">
                    <input
                      value={ncmSearch}
                      onChange={(e) => handleNcmSearch(e.target.value)}
                      placeholder="Digite descrição ou código NCM..."
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
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CFOP</label>
                  <input {...register('cfop')} placeholder="Ex: 5102" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
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
        </>
      )}

      {/* Tab: Price History */}
      {tab === 'history' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {!priceHistory || priceHistory.length === 0 ? (
            <div className="p-6 text-gray-500 text-sm">{t('products.noPriceHistory')}</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.price')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.cost')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.margin')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {priceHistory.map((h: any) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{fmt(h.priceCents, product.currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmt(h.costCents, product.currency)}</td>
                    <td className="px-4 py-3 text-sm">
                      {h.marginPercent != null ? (
                        <span className={`font-medium ${h.marginPercent < 20 ? 'text-red-600' : h.marginPercent < 40 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {h.marginPercent.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{h.reason || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(h.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Stock Movements */}
      {tab === 'movements' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {!stockMovements || stockMovements.length === 0 ? (
            <div className="p-6 text-gray-500 text-sm">{t('products.noStockMovements')}</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockMovements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        m.type === 'IN' ? 'bg-green-100 text-green-700' :
                        m.type === 'OUT' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {m.type === 'IN' ? 'Entrada' : m.type === 'OUT' ? 'Saída' : 'Ajuste'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      <span className={m.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.reason || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-1 text-gray-900">{t('products.adjustStock')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('products.adjustStockDesc')}</p>
            <p className="text-sm text-gray-700 mb-4">
              {t('products.stockQty')} atual: <strong>{product.stockQuantity}</strong>
            </p>

            {adjustError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3 text-sm">{adjustError}</div>
            )}
            {adjustSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded mb-3 text-sm">{adjustSuccess}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.adjustQty')}</label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="+10 ou -5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Use negativo para subtrair do estoque.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.adjustReason')}</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: Compra de fornecedor, devolução..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => adjustStockMutation.mutate()}
                disabled={adjustStockMutation.isPending || !adjustQty}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {adjustStockMutation.isPending ? t('common.saving') : t('common.confirm')}
              </button>
              <button
                onClick={() => { setShowAdjustModal(false); setAdjustError(''); setAdjustSuccess(''); setAdjustQty(''); setAdjustReason(''); }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 text-sm"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
