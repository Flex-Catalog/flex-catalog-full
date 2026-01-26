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
    items: Array<{
      description: string;
      quantity: number;
      unitPriceCents: number;
    }>;
    customer: {
      name: string;
      taxId: string;
    };
  };
  result?: {
    invoiceNumber?: string;
    message?: string;
  };
  createdAt: string;
}

interface CreateInvoiceForm {
  country: string;
  customerName: string;
  customerTaxId: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceCents: number;
  }>;
}

export default function InvoicesPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, watch, setValue } = useForm<CreateInvoiceForm>({
    defaultValues: {
      country: 'US',
      customerName: '',
      customerTaxId: '',
      items: [{ description: '', quantity: 1, unitPriceCents: 0 }],
    },
  });

  const items = watch('items');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.get('/invoices');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateInvoiceForm) => {
      const payload = {
        country: data.country,
        payload: {
          customer: {
            name: data.customerName,
            taxId: data.customerTaxId,
          },
          items: data.items.map(item => ({
            ...item,
            unitPriceCents: Math.round(item.unitPriceCents * 100),
          })),
        },
      };
      const res = await api.post('/invoices', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowModal(false);
      reset();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('common.error'));
    },
  });

  const issueMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/invoices/${id}/issue`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || t('common.error'));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/invoices/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const addItem = () => {
    const currentItems = watch('items');
    setValue('items', [...currentItems, { description: '', quantity: 1, unitPriceCents: 0 }]);
  };

  const removeItem = (index: number) => {
    const currentItems = watch('items');
    setValue('items', currentItems.filter((_, i) => i !== index));
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

  if (isLoading) {
    return <div>{t('common.loading')}</div>;
  }

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
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {invoice.result?.invoiceNumber || invoice.id.slice(-8)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{invoice.payload?.customer?.name}</div>
                  <div className="text-sm text-gray-500">{invoice.payload?.customer?.taxId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xl">
                    {invoice.country === 'BR' ? '🇧🇷' :
                     invoice.country === 'US' ? '🇺🇸' :
                     invoice.country === 'PT' ? '🇵🇹' : '🌍'}
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
                    <span className="text-gray-400">{t('invoices.issued')}</span>
                  )}
                  {invoice.status === 'FAILED' && (
                    <span className="text-red-500" title={invoice.result?.message}>
                      {t('invoices.failed')}
                    </span>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('invoices.country')} *
                </label>
                <select
                  {...register('country')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="US">🇺🇸 United States</option>
                  <option value="BR">🇧🇷 Brazil</option>
                  <option value="PT">🇵🇹 Portugal</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('invoices.customerName')} *
                  </label>
                  <input
                    {...register('customerName', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('invoices.taxId')} *
                  </label>
                  <input
                    {...register('customerTaxId', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Tax ID"
                  />
                </div>
              </div>

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
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 px-2"
                      >
                        X
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
                  onClick={() => {
                    setShowModal(false);
                    reset();
                    setError('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
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
