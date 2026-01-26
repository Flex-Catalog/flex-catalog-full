'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useState } from 'react';

interface ProductForm {
  name: string;
  sku: string;
  priceCents: number;
  currency: string;
  categoryId?: string;
  isActive: boolean;
  attributes: { key: string; value: string }[];
}

export default function NewProductPage() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { register, handleSubmit, control, formState: { errors } } = useForm<ProductForm>({
    defaultValues: {
      name: '',
      sku: '',
      priceCents: 0,
      currency: 'USD',
      isActive: true,
      attributes: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'attributes',
  });

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

      const res = await api.post('/products', {
        ...data,
        priceCents: Math.round(data.priceCents * 100),
        attributes,
        categoryId: data.categoryId || undefined,
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

  const onSubmit = (data: ProductForm) => {
    setError('');
    createMutation.mutate(data);
  };

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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('products.name')} *
          </label>
          <input
            {...register('name', { required: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('products.namePlaceholder')}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{t('validation.required')}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SKU
          </label>
          <input
            {...register('sku')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="SKU-001"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('products.price')} *
            </label>
            <input
              type="number"
              step="0.01"
              {...register('priceCents', { required: true, min: 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('products.currency')}
            </label>
            <select
              {...register('currency')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USD">USD</option>
              <option value="BRL">BRL</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('products.category')}
          </label>
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
            <label className="block text-sm font-medium text-gray-700">
              {t('products.attributes')}
            </label>
            <button
              type="button"
              onClick={() => append({ key: '', value: '' })}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + {t('products.addAttribute')}
            </button>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 mb-2">
              <input
                {...register(`attributes.${index}.key`)}
                placeholder={t('products.attributeKey')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                {...register(`attributes.${index}.value`)}
                placeholder={t('products.attributeValue')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-red-600 hover:text-red-800 px-2"
              >
                X
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            {...register('isActive')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-700">
            {t('products.active')}
          </label>
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
            href="/app/products"
            className="flex-1 text-center bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            {t('common.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}
