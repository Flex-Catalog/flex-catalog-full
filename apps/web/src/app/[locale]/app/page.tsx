'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function DashboardPage() {
  const t = useTranslations();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t('reports.dashboard')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/app/products"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg"
        >
          <h2 className="text-xl font-semibold mb-2">{t('products.title')}</h2>
          <p className="text-gray-600">Gerencie seus produtos</p>
        </Link>
        <Link
          href="/app/categories"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg"
        >
          <h2 className="text-xl font-semibold mb-2">
            {t('categories.title')}
          </h2>
          <p className="text-gray-600">Organize por categorias</p>
        </Link>
        <Link
          href="/app/invoices"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg"
        >
          <h2 className="text-xl font-semibold mb-2">{t('invoices.title')}</h2>
          <p className="text-gray-600">Emita notas fiscais</p>
        </Link>
      </div>
    </div>
  );
}
