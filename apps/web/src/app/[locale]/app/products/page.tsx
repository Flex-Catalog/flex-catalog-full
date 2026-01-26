'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function ProductsPage() {
  const t = useTranslations();
  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data;
    },
  });

  if (isLoading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t('products.list')}</h1>
        <Link
          href="/app/products/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {t('products.create')}
        </Link>
      </div>
      {data?.data?.length === 0 ? (
        <p>{t('products.noProducts')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.data?.map((product: any) => (
            <div key={product.id} className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-gray-600">
                {t('products.price')}: ${(product.priceCents / 100).toFixed(2)}
              </p>
              <p className="text-sm">
                {product.isActive ? t('products.active') : t('products.inactive')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
