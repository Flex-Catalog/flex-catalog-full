'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface Product {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  currency: string;
  isActive: boolean;
  categoryId?: string;
}

interface EditForm {
  name: string;
  sku: string;
  priceCents: number;
  currency: string;
  categoryId: string;
  isActive: boolean;
}

export default function ProductsPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const { register, handleSubmit, reset } = useForm<EditForm>();

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products?limit=100');
      return res.data;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: EditForm }) => {
      const res = await api.patch(`/products/${id}`, {
        name: formData.name,
        sku: formData.sku,
        priceCents: Math.round(formData.priceCents * 100),
        currency: formData.currency,
        categoryId: formData.categoryId || null,
        isActive: formData.isActive,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('common.error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteTarget(null);
      setDeleteError('');
    },
    onError: (err: any) => {
      setDeleteError(err.response?.data?.message || t('common.error'));
    },
  });

  const openEdit = (product: Product) => {
    setError('');
    setEditingProduct(product);
    reset({
      name: product.name,
      sku: product.sku ?? '',
      priceCents: product.priceCents / 100,
      currency: product.currency,
      categoryId: product.categoryId ?? '',
      isActive: product.isActive,
    });
  };

  const onSubmit = (formData: EditForm) => {
    if (!editingProduct) return;
    updateMutation.mutate({ id: editingProduct.id, formData });
  };

  if (isLoading) return <div className="text-gray-500">{t('common.loading')}</div>;

  const products: Product[] = data?.data ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('products.list')}</h1>
        <Link
          href="/app/products/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {t('products.create')}
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-gray-500">{t('products.noProducts')}</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.price')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.category')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoices.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => {
                const category = categoriesData?.data?.find((c: any) => c.id === product.categoryId);
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{product.sku || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {product.currency} {(product.priceCents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {category?.name || t('products.noCategory')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        product.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {product.isActive ? t('products.active') : t('products.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-3 whitespace-nowrap">
                      <Link
                        href={`/app/products/${product.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {t('common.edit')}
                      </Link>
                      <button
                        onClick={() => { setDeleteTarget(product); setDeleteError(''); }}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{t('products.edit')}</h2>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.name')} *</label>
                <input
                  {...register('name', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input
                  {...register('sku')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.price')} *</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('priceCents', { required: true, valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.currency')}</label>
                  <select {...register('currency')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="BRL">BRL</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('products.category')}</label>
                <select {...register('categoryId')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">{t('products.noCategory')}</option>
                  {categoriesData?.data?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label className="text-sm text-gray-700">{t('products.active')}</label>
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? t('common.saving') : t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingProduct(null); setError(''); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2 text-gray-900">{t('common.delete')} produto</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Tem certeza que deseja excluir <strong>{deleteTarget.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            {deleteError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {deleteError}
              </div>
            )}
            <div className="flex gap-4">
              {!deleteError && (
                <button
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? t('common.saving') : t('common.delete')}
                </button>
              )}
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
                className={`${deleteError ? 'w-full' : 'flex-1'} bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300`}
              >
                {deleteError ? 'Fechar' : t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
