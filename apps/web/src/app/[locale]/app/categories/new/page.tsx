'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useState } from 'react';

interface CategoryForm {
  name: string;
  parentId?: string;
}

export default function NewCategoryPage() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<CategoryForm>({
    defaultValues: { name: '', parentId: '' },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryForm) => {
      const res = await api.post('/categories', {
        name: data.name,
        parentId: data.parentId || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      router.push('/app/categories');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('common.error'));
    },
  });

  const onSubmit = (data: CategoryForm) => {
    setError('');
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('categories.create')}</h1>
        <Link href="/app/categories" className="text-gray-600 hover:text-gray-800">
          {t('common.back')}
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('categories.name')} *
          </label>
          <input
            {...register('name', { required: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('categories.name')}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{t('validation.required')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('categories.parent')}
          </label>
          <select
            {...register('parentId')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— {t('categories.noCategories')} —</option>
            {categoriesData?.data?.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? t('common.saving') : t('common.save')}
          </button>
          <Link
            href="/app/categories"
            className="flex-1 text-center bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            {t('common.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}
