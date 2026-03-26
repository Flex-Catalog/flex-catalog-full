'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

interface SaleItem {
  id?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  unitCostCents?: number;
  totalCents: number;
}

interface Sale {
  id: string;
  orderNumber: string;
  customerName: string;
  customerTaxId?: string;
  channel: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  notes?: string;
  stockDeducted: boolean;
  items: SaleItem[];
  createdAt: string;
}

interface NewSaleForm {
  customerName: string;
  customerTaxId: string;
  channel: string;
  discountCents: number;
  shippingCents: number;
  notes: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pendente',   color: 'bg-yellow-100 text-yellow-700' },
  PAID:      { label: 'Pago',       color: 'bg-blue-100 text-blue-700' },
  SHIPPED:   { label: 'Enviado',    color: 'bg-purple-100 text-purple-700' },
  DELIVERED: { label: 'Entregue',   color: 'bg-green-100 text-green-700' },
  CANCELED:  { label: 'Cancelado',  color: 'bg-red-100 text-red-700' },
  REFUNDED:  { label: 'Reembolsado', color: 'bg-gray-100 text-gray-700' },
};

const CHANNELS: Record<string, string> = {
  DIRECT: 'Direto',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  SHOPEE: 'Shopee',
};

const NEXT_STATUS: Record<string, { label: string; value: string }[]> = {
  PENDING:   [{ label: 'Marcar como Pago', value: 'PAID' }, { label: 'Cancelar', value: 'CANCELED' }],
  PAID:      [{ label: 'Marcar como Enviado', value: 'SHIPPED' }, { label: 'Cancelar', value: 'CANCELED' }],
  SHIPPED:   [{ label: 'Marcar como Entregue', value: 'DELIVERED' }, { label: 'Reembolsar', value: 'REFUNDED' }],
  DELIVERED: [{ label: 'Reembolsar', value: 'REFUNDED' }],
  CANCELED:  [],
  REFUNDED:  [],
};

export default function SalesPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [formError, setFormError] = useState('');
  const [period, setPeriod] = useState('month');

  // Create form state
  const [form, setForm] = useState<NewSaleForm>({
    customerName: '', customerTaxId: '', channel: 'DIRECT',
    discountCents: 0, shippingCents: 0, notes: '',
  });
  const [formItems, setFormItems] = useState<Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    unitCostCents?: number;
  }>>([]);
  const [productSearch, setProductSearch] = useState('');

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', statusFilter, channelFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (channelFilter) params.set('channel', channelFilter);
      if (search) params.set('search', search);
      const res = await api.get(`/sales?${params}`);
      return res.data;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ['sales-summary', period],
    queryFn: async () => {
      const res = await api.get(`/sales/summary?period=${period}`);
      return res.data;
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-sale'],
    queryFn: async () => {
      const res = await api.get('/products?limit=200&isActive=true');
      return res.data;
    },
    enabled: showCreateModal,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.customerName.trim()) throw new Error('Nome do cliente é obrigatório');
      if (formItems.length === 0) throw new Error('Adicione ao menos um item');
      const res = await api.post('/sales', {
        customerName: form.customerName,
        customerTaxId: form.customerTaxId || undefined,
        channel: form.channel,
        discountCents: Math.round((form.discountCents || 0) * 100),
        shippingCents: Math.round((form.shippingCents || 0) * 100),
        notes: form.notes || undefined,
        items: formItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPriceCents: Math.round(item.unitPriceCents * 100),
          unitCostCents: item.unitCostCents != null ? Math.round(item.unitCostCents * 100) : undefined,
        })),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || err.message || t('common.error'));
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/sales/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
      setSelectedSale(updated);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setSelectedSale(null);
    },
  });

  const resetForm = () => {
    setForm({ customerName: '', customerTaxId: '', channel: 'DIRECT', discountCents: 0, shippingCents: 0, notes: '' });
    setFormItems([]);
    setFormError('');
    setProductSearch('');
  };

  const addProductItem = (product: any) => {
    const existing = formItems.findIndex(i => i.productId === product.id);
    if (existing >= 0) {
      const updated = [...formItems];
      updated[existing].quantity += 1;
      setFormItems(updated);
    } else {
      setFormItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPriceCents: product.priceCents / 100,
        unitCostCents: product.costCents != null ? product.costCents / 100 : undefined,
      }]);
    }
    setProductSearch('');
  };

  const addCustomItem = () => {
    setFormItems(prev => [...prev, {
      productName: '',
      quantity: 1,
      unitPriceCents: 0,
    }]);
  };

  const removeItem = (idx: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== idx));
  };

  const subtotal = formItems.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  const total = subtotal - (form.discountCents || 0) + (form.shippingCents || 0);

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const sales: Sale[] = salesData?.data ?? [];

  const filteredProducts = productsData?.data?.filter(
    (p: any) => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.sku || '').toLowerCase().includes(productSearch.toLowerCase())
  ) ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('sales.title')}</h1>
        <button
          onClick={() => { setShowCreateModal(true); setFormError(''); }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
        >
          {t('sales.create')}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 mb-1">{t('sales.revenue')}</div>
            <div className="text-xl font-bold text-gray-900">{fmt(summary.totalRevenueCents)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 mb-1">{t('sales.profit')}</div>
            <div className={`text-xl font-bold ${summary.profitCents < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {fmt(summary.profitCents)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 mb-1">{t('products.margin')}</div>
            <div className={`text-xl font-bold ${summary.marginPercent < 20 ? 'text-yellow-600' : 'text-green-600'}`}>
              {summary.marginPercent.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 mb-1">{t('sales.salesCount')}</div>
            <div className="text-xl font-bold text-gray-900">{summary.salesCount}</div>
          </div>
        </div>
      )}

      {/* Period selector + Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
          <option value="day">{t('sales.today')}</option>
          <option value="week">{t('sales.thisWeek')}</option>
          <option value="month">{t('sales.thisMonth')}</option>
          <option value="year">{t('sales.thisYear')}</option>
        </select>
        <input
          type="text"
          placeholder={t('common.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 min-w-32"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
          <option value="">{t('sales.allStatuses')}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
          <option value="">{t('sales.allChannels')}</option>
          {Object.entries(CHANNELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Sales table */}
      {isLoading ? (
        <div className="text-gray-500">{t('common.loading')}</div>
      ) : sales.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">{t('sales.noSales')}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sales.orderNumber')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sales.customer')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sales.channel')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoices.status')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sales.total')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => {
                  const st = STATUS_LABELS[sale.status] ?? { label: sale.status, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{sale.orderNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div>{sale.customerName}</div>
                        {sale.customerTaxId && <div className="text-xs text-gray-400">{sale.customerTaxId}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{CHANNELS[sale.channel] ?? sale.channel}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{fmt(sale.totalCents)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(sale.createdAt)}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {t('common.edit')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Sale Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">{t('sales.create')}</h2>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">{formError}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.customer')} *</label>
                  <input
                    value={form.customerName}
                    onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Nome do cliente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                  <input
                    value={form.customerTaxId}
                    onChange={e => setForm(f => ({ ...f, customerTaxId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.channel')}</label>
                  <select
                    value={form.channel}
                    onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {Object.entries(CHANNELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">{t('sales.items')} *</label>
                  <button
                    type="button"
                    onClick={addCustomItem}
                    className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-1"
                  >
                    + {t('sales.addCustomItem')}
                  </button>
                </div>

                {/* Product search */}
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder={t('sales.searchProduct')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  {productSearch && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredProducts.slice(0, 10).map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProductItem(p)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex justify-between"
                        >
                          <span>{p.name} {p.sku ? <span className="text-gray-400 text-xs">({p.sku})</span> : ''}</span>
                          <span className="text-gray-500 text-xs">{fmt(p.priceCents)} · estoque: {p.stockQuantity}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {formItems.length === 0 ? (
                  <div className="text-sm text-gray-400 py-4 text-center border border-dashed rounded-md">
                    Busque um produto ou adicione item manualmente
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-gray-50 rounded p-2">
                        <input
                          value={item.productName}
                          onChange={e => {
                            const u = [...formItems];
                            u[idx].productName = e.target.value;
                            setFormItems(u);
                          }}
                          placeholder="Nome do produto"
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          min={1}
                          onChange={e => {
                            const u = [...formItems];
                            u[idx].quantity = parseInt(e.target.value) || 1;
                            setFormItems(u);
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPriceCents}
                          onChange={e => {
                            const u = [...formItems];
                            u[idx].unitPriceCents = parseFloat(e.target.value) || 0;
                            setFormItems(u);
                          }}
                          placeholder="Preço unit."
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        />
                        <span className="text-sm text-gray-500 w-20 text-right">
                          {fmt(item.unitPriceCents * item.quantity * 100)}
                        </span>
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.discount')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.discountCents}
                      onChange={e => setForm(f => ({ ...f, discountCents: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.shipping')}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.shippingCents}
                      onChange={e => setForm(f => ({ ...f, shippingCents: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">{t('sales.subtotal')}: {fmt(subtotal * 100)}</span>
                  <span className="text-lg font-bold text-gray-900 ml-4">{t('sales.total')}: {fmt(total * 100)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sales.notes')}</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {createMutation.isPending ? t('common.saving') : t('sales.createSale')}
              </button>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">{selectedSale.orderNumber}</h2>
                <p className="text-sm text-gray-500">{selectedSale.customerName}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_LABELS[selectedSale.status]?.color}`}>
                {STATUS_LABELS[selectedSale.status]?.label}
              </span>
            </div>

            <div className="p-6 space-y-4">
              {/* Items */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('sales.items')}</h3>
                <table className="min-w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {selectedSale.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1 text-gray-700">{item.productName}</td>
                        <td className="py-1 text-gray-500 text-right px-3">×{item.quantity}</td>
                        <td className="py-1 text-gray-700 text-right">{fmt(item.totalCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>{t('sales.subtotal')}</span><span>{fmt(selectedSale.subtotalCents)}</span>
                </div>
                {selectedSale.discountCents > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>{t('sales.discount')}</span><span>-{fmt(selectedSale.discountCents)}</span>
                  </div>
                )}
                {selectedSale.shippingCents > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>{t('sales.shipping')}</span><span>+{fmt(selectedSale.shippingCents)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>{t('sales.total')}</span><span>{fmt(selectedSale.totalCents)}</span>
                </div>
              </div>

              {selectedSale.notes && (
                <div className="text-sm text-gray-500 bg-gray-50 rounded p-3">{selectedSale.notes}</div>
              )}

              {/* Status actions */}
              {NEXT_STATUS[selectedSale.status]?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Ações</h3>
                  <div className="flex gap-2 flex-wrap">
                    {NEXT_STATUS[selectedSale.status].map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => statusMutation.mutate({ id: selectedSale.id, status: value })}
                        disabled={statusMutation.isPending}
                        className={`px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50 ${
                          value === 'CANCELED' || value === 'REFUNDED'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex gap-3">
              {(selectedSale.status === 'PENDING') && (
                <button
                  onClick={() => deleteMutation.mutate(selectedSale.id)}
                  disabled={deleteMutation.isPending}
                  className="bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm hover:bg-red-200 disabled:opacity-50"
                >
                  {t('common.delete')}
                </button>
              )}
              <button
                onClick={() => setSelectedSale(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 text-sm"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
