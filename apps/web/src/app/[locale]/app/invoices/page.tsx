'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface Invoice {
  id: string;
  country: string;
  status: string;
  payload: {
    items?: Array<{ description: string; quantity: number; unitPriceCents: number }>;
    itens?: Array<{ descricao: string; quantidade: number; valorUnitarioCents: number }>;
    customer?: { name: string; taxId: string };
    destinatario?: { nome: string; cpfCnpj: string };
    naturezaOperacao?: string;
  };
  result?: {
    invoiceNumber?: string;
    numeroNfe?: number;
    serieNfe?: string;
    chaveNfe?: string;
    dataEmissao?: string;
    urlDanfe?: string;
    protocolo?: string;
    issuedAt?: string;
    message?: string;
  };
  issuedAt?: string;
  createdAt: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

interface CreateInvoiceForm {
  country: string;
  customerName: string;
  customerTaxId: string;
  naturezaOperacao: string;
  items: InvoiceItem[];
}

export default function InvoicesPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const { register, handleSubmit, reset, watch, setValue } = useForm<CreateInvoiceForm>({
    defaultValues: {
      country: 'BR',
      customerName: '',
      customerTaxId: '',
      naturezaOperacao: 'Prestação de serviços',
      items: [{ description: '', quantity: 1, unitPriceCents: 0 }],
    },
  });

  const selectedCountry = watch('country');
  const items = watch('items');

  // Load products for the picker
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products?limit=100');
      return res.data;
    },
    enabled: showModal,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.get('/invoices');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: CreateInvoiceForm) => {
      let payload: Record<string, unknown>;

      if (formData.country === 'BR') {
        payload = {
          naturezaOperacao: formData.naturezaOperacao || 'Prestação de serviços',
          destinatario: {
            nome: formData.customerName,
            cpfCnpj: formData.customerTaxId,
          },
          itens: formData.items.map((item) => ({
            descricao: item.description,
            quantidade: item.quantity,
            valorUnitarioCents: Math.round(item.unitPriceCents * 100),
          })),
        };
      } else {
        payload = {
          customer: {
            name: formData.customerName,
            taxId: formData.customerTaxId,
          },
          items: formData.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: Math.round(item.unitPriceCents * 100),
          })),
        };
      }

      const res = await api.post('/invoices', {
        country: formData.country,
        payload,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowModal(false);
      reset();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.response?.data?.message || t('common.error'));
    },
  });

  const issueMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/invoices/${id}/issue`);
      return res.data;
    },
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || t('common.error');
      setActionError(`Erro ao emitir: ${msg}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/invoices/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || t('common.error');
      setActionError(`Erro ao cancelar: ${msg}`);
    },
  });

  const addItem = () => {
    setValue('items', [...items, { description: '', quantity: 1, unitPriceCents: 0 }]);
  };

  const removeItem = (index: number) => {
    setValue('items', items.filter((_, i) => i !== index));
  };

  const fillFromProduct = (index: number, product: any) => {
    const updated = [...items];
    updated[index] = {
      description: product.name,
      quantity: 1,
      unitPriceCents: (product.priceCents || 0) / 100,
    };
    setValue('items', updated);
  };

  const onSubmit = (data: CreateInvoiceForm) => {
    setError('');
    createMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ISSUED': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'CANCELED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCustomerName = (invoice: Invoice) => {
    return invoice.payload?.customer?.name || invoice.payload?.destinatario?.nome || '—';
  };

  const getCustomerTaxId = (invoice: Invoice) => {
    return invoice.payload?.customer?.taxId || invoice.payload?.destinatario?.cpfCnpj || '—';
  };

  const getInvoiceNumber = (invoice: Invoice) => {
    return invoice.result?.invoiceNumber || invoice.result?.numeroNfe?.toString() || invoice.id.slice(-8);
  };

  if (isLoading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('invoices.title')}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {t('invoices.create')}
        </button>
      </div>

      {actionError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm flex justify-between items-start">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-4 text-red-500 hover:text-red-700 font-bold">×</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID / {t('invoices.number')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('invoices.customer')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('invoices.country')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('invoices.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('invoices.date')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  {t('invoices.noInvoices')}
                </td>
              </tr>
            )}
            {data?.data?.map((invoice: Invoice) => (
              <tr key={invoice.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getInvoiceNumber(invoice)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{getCustomerName(invoice)}</div>
                  <div className="text-sm text-gray-500">{getCustomerTaxId(invoice)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xl">
                    {invoice.country === 'BR' ? '🇧🇷' : invoice.country === 'US' ? '🇺🇸' : invoice.country === 'PT' ? '🇵🇹' : '🌍'}
                  </span>
                  <span className="ml-2 text-sm text-gray-600">{invoice.country}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(invoice.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {invoice.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => issueMutation.mutate(invoice.id)}
                        disabled={issueMutation.isPending}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        {t('invoices.issue')}
                      </button>
                      <button
                        onClick={() => cancelMutation.mutate(invoice.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        {t('invoices.cancel')}
                      </button>
                    </>
                  )}
                  {invoice.status === 'ISSUED' && (
                    <button
                      onClick={() => setViewingInvoice(invoice)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {t('invoices.viewDetails')}
                    </button>
                  )}
                  {invoice.status === 'FAILED' && (
                    <button
                      onClick={() => setViewingInvoice(invoice)}
                      className="text-red-500 hover:text-red-700 font-medium"
                      title={invoice.result?.message}
                    >
                      {t('invoices.failed')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{t('invoices.create')}</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.country')} *
                </label>
                <select
                  {...register('country')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="BR">🇧🇷 Brasil (NF-e)</option>
                  <option value="US">🇺🇸 United States</option>
                  <option value="PT">🇵🇹 Portugal</option>
                </select>
              </div>

              {/* Natureza da Operação (Brazil only) */}
              {selectedCountry === 'BR' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('invoices.naturezaOperacao')} *
                  </label>
                  <input
                    {...register('naturezaOperacao', { required: selectedCountry === 'BR' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ex: Prestação de serviços"
                  />
                </div>
              )}

              {/* Customer */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('invoices.customerName')} *
                  </label>
                  <input
                    {...register('customerName', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder={selectedCountry === 'BR' ? 'Nome completo / Razão social' : 'Customer name'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedCountry === 'BR' ? 'CPF / CNPJ' : t('invoices.taxId')} *
                  </label>
                  <input
                    {...register('customerTaxId', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder={selectedCountry === 'BR' ? '000.000.000-00' : 'Tax ID'}
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('invoices.items')} *
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + {t('invoices.addItem')}
                  </button>
                </div>

                {/* Product picker */}
                {productsData?.data?.length > 0 && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-md">
                    <p className="text-xs text-blue-700 font-medium mb-2">{t('invoices.pickFromCatalog')}</p>
                    <div className="flex flex-wrap gap-2">
                      {productsData.data.slice(0, 10).map((product: any) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            const currentItems = watch('items');
                            const emptyIdx = currentItems.findIndex((it) => !it.description);
                            if (emptyIdx >= 0) {
                              fillFromProduct(emptyIdx, product);
                            } else {
                              setValue('items', [
                                ...currentItems,
                                {
                                  description: product.name,
                                  quantity: 1,
                                  unitPriceCents: (product.priceCents || 0) / 100,
                                },
                              ]);
                            }
                          }}
                          className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                        >
                          {product.name} — {product.currency} {((product.priceCents || 0) / 100).toFixed(2)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {items.map((_, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      {...register(`items.${index}.description`)}
                      placeholder={t('invoices.itemDescription')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="number"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      placeholder={t('invoices.quantity')}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.unitPriceCents`, { valueAsNumber: true })}
                      placeholder={t('invoices.unitPrice')}
                      className="w-28 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? t('common.saving') : t('invoices.createDraft')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); reset(); setError(''); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {viewingInvoice.country === 'BR' ? 'Nota Fiscal Eletrônica' : 'Invoice'} #{getInvoiceNumber(viewingInvoice)}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {new Date(viewingInvoice.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => setViewingInvoice(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  viewingInvoice.status === 'ISSUED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {viewingInvoice.status === 'ISSUED' ? 'Emitida' : 'Falhou'}
                </span>
                <span className="text-sm text-gray-500">
                  {viewingInvoice.country === 'BR' ? '🇧🇷 Brasil' : viewingInvoice.country === 'US' ? '🇺🇸 United States' : '🇵🇹 Portugal'}
                </span>
              </div>

              {/* Customer */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Cliente / Destinatário</h3>
                <p className="font-medium text-gray-900">{getCustomerName(viewingInvoice)}</p>
                <p className="text-sm text-gray-500">{getCustomerTaxId(viewingInvoice)}</p>
              </div>

              {/* Items */}
              {(viewingInvoice.payload?.items || viewingInvoice.payload?.itens) && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Itens</h3>
                  <div className="space-y-1">
                    {viewingInvoice.payload.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100">
                        <span className="text-gray-700">{item.description} × {item.quantity}</span>
                        <span className="font-medium">R$ {(item.unitPriceCents / 100 * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    {viewingInvoice.payload.itens?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100">
                        <span className="text-gray-700">{item.descricao} × {item.quantidade}</span>
                        <span className="font-medium">R$ {(item.valorUnitarioCents / 100 * item.quantidade).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NF-e Result (Brazil) */}
              {viewingInvoice.result && viewingInvoice.status === 'ISSUED' && (
                <div className="bg-green-50 rounded-lg p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-green-700 uppercase mb-3">Dados da NF-e</h3>
                  {viewingInvoice.result.numeroNfe && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Número NF-e</span>
                      <span className="font-mono font-medium">{viewingInvoice.result.numeroNfe}</span>
                    </div>
                  )}
                  {viewingInvoice.result.serieNfe && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Série</span>
                      <span className="font-mono">{viewingInvoice.result.serieNfe}</span>
                    </div>
                  )}
                  {viewingInvoice.result.invoiceNumber && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Número</span>
                      <span className="font-mono font-medium">{viewingInvoice.result.invoiceNumber}</span>
                    </div>
                  )}
                  {viewingInvoice.result.protocolo && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Protocolo</span>
                      <span className="font-mono">{viewingInvoice.result.protocolo}</span>
                    </div>
                  )}
                  {viewingInvoice.result.chaveNfe && (
                    <div className="text-sm pt-1">
                      <span className="text-gray-600 block mb-1">Chave de Acesso</span>
                      <span className="font-mono text-xs break-all bg-white px-2 py-1 rounded border text-gray-700 block">
                        {viewingInvoice.result.chaveNfe}
                      </span>
                    </div>
                  )}
                  {viewingInvoice.result.dataEmissao && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Emissão</span>
                      <span>{new Date(viewingInvoice.result.dataEmissao).toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error message for FAILED */}
              {viewingInvoice.status === 'FAILED' && viewingInvoice.result?.message && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="text-xs font-semibold text-red-600 uppercase mb-2">Erro</h3>
                  <p className="text-sm text-red-700">{viewingInvoice.result.message}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Imprimir
              </button>
              <button
                onClick={() => setViewingInvoice(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 text-sm font-medium"
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
