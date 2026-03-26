'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  costCents: number | null;
  currency: string;
  stockQuantity: number;
  stockMinAlert: number | null;
  marginPercent: number | null;
  isLowStock: boolean;
  isActive: boolean;
  categoryId?: string;
}

export default function ProductsPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState('');

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

  if (isLoading) return <div className="text-gray-500">{t('common.loading')}</div>;

  const products: Product[] = data?.data ?? [];

  const fmt = (cents: number | null, currency = 'BRL') =>
    cents == null ? '—' : `${currency} ${(cents / 100).toFixed(2)}`;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('products.list')}</h1>
        <Link
          href="/app/products/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
        >
          {t('products.create')}
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-gray-500">{t('products.noProducts')}</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.name')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.price')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.cost')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.margin')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('products.stockQty')}</th>
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
                      <td className="px-4 py-3 text-sm text-gray-700">{fmt(product.priceCents, product.currency)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{fmt(product.costCents, product.currency)}</td>
                      <td className="px-4 py-3 text-sm">
                        {product.marginPercent != null ? (
                          <span className={`font-medium ${product.marginPercent < 20 ? 'text-red-600' : product.marginPercent < 40 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {product.marginPercent.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1">
                          <span className={`font-medium ${product.stockQuantity === 0 ? 'text-red-600' : product.isLowStock ? 'text-yellow-600' : 'text-gray-700'}`}>
                            {product.stockQuantity}
                          </span>
                          {product.stockQuantity === 0 && (
                            <span className="text-xs bg-red-100 text-red-700 px-1 rounded">{t('products.outOfStock')}</span>
                          )}
                          {product.stockQuantity > 0 && product.isLowStock && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">{t('products.lowStock')}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {category?.name || t('products.noCategory')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
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
