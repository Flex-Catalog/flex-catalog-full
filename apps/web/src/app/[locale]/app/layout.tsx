'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Cookies from 'js-cookie';
import { useState, useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth and load user
    const token = Cookies.get('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    // Load user data
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore errors
    }
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    router.push('/login');
  };

  if (loading) {
    return <div className="p-4">{t('common.loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/app" className="text-xl font-bold">
            FlexCatalog
          </Link>
          <div className="flex gap-4 items-center text-sm">
            <Link href="/app/products">{t('products.title')}</Link>
            <Link href="/app/categories">{t('categories.title')}</Link>
            <Link href="/app/invoices">{t('invoices.title')}</Link>
            <Link href="/app/reports">{t('reports.title')}</Link>
            <Link href="/app/users">{t('users.title')}</Link>
            <Link href="/app/audit">{t('nav.audit')}</Link>
            <Link href="/app/billing">{t('billing.title')}</Link>
            <Link href="/app/support">{t('support.title')}</Link>
            <Link href="/app/affiliates">{t('affiliate.title')}</Link>
            {user?.roles?.includes('PLATFORM_ADMIN') && (
              <Link href="/app/admin" className="text-yellow-300 font-semibold">
                Admin
              </Link>
            )}
            <button onClick={handleLogout} className="ml-4">
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </nav>
      <main className="container mx-auto p-4">{children}</main>
    </div>
  );
}
