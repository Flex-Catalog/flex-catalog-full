'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function CategoriesPage() {
  const t = useTranslations();
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });

  if (isLoading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t('categories.list')}</h1>
        <Link
          href="/app/categories/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {t('categories.create')}
        </Link>
      </div>
      {data?.length === 0 ? (
        <p>{t('categories.noCategories')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.map((category: any) => (
            <div key={category.id} className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">{category.name}</h3>
              {category.parent && (
                <p className="text-sm text-gray-600">
                  {t('categories.parent')}: {category.parent.name}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
