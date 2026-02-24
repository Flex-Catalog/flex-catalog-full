'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface Category {
  id: string;
  name: string;
  parentId?: string;
  parent?: { id: string; name: string };
}

interface EditForm {
  name: string;
  parentId: string;
}

export default function CategoriesPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [editError, setEditError] = useState('');

  const { register, handleSubmit, reset } = useForm<EditForm>();

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: EditForm }) => {
      const res = await api.patch(`/categories/${id}`, {
        name: formData.name,
        parentId: formData.parentId || null,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingCategory(null);
      setEditError('');
    },
    onError: (err: any) => {
      setEditError(err.response?.data?.message || t('common.error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteTarget(null);
      setDeleteError('');
    },
    onError: (err: any) => {
      // 409 Conflict = category is in use by products
      const msg = err.response?.data?.message || t('common.error');
      setDeleteError(msg);
    },
  });

  const openEdit = (cat: Category) => {
    setEditError('');
    setEditingCategory(cat);
    reset({ name: cat.name, parentId: cat.parentId ?? '' });
  };

  const openDelete = (cat: Category) => {
    setDeleteError('');
    setDeleteTarget(cat);
  };

  const onSubmit = (formData: EditForm) => {
    if (!editingCategory) return;
    updateMutation.mutate({ id: editingCategory.id, formData });
  };

  if (isLoading) return <div className="text-gray-500">{t('common.loading')}</div>;

  const categories: Category[] = data?.data ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('categories.list')}</h1>
        <Link
          href="/app/categories/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {t('categories.create')}
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="text-gray-500">{t('categories.noCategories')}</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('categories.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('categories.parent')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((cat) => {
                const parentCat = categories.find((c) => c.id === cat.parentId);
                return (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{cat.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {parentCat?.name || cat.parent?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => openDelete(cat)}
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
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{t('categories.edit')}</h2>
            {editError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {editError}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('categories.name')} *</label>
                <input
                  {...register('name', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('categories.parent')}</label>
                <select
                  {...register('parentId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Nenhuma —</option>
                  {categories
                    .filter((c) => c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
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
                  onClick={() => { setEditingCategory(null); setEditError(''); }}
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
            <h2 className="text-lg font-bold mb-2 text-gray-900">{t('common.delete')} categoria</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Tem certeza que deseja excluir <strong>{deleteTarget.name}</strong>?
              Se houver produtos usando esta categoria, a exclusão será bloqueada.
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
