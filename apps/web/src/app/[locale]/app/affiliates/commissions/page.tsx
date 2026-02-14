'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

interface Commission {
  id: string;
  amountCents: number;
  commissionPercent: number;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  tenant: {
    id: string;
    name: string;
  };
}

interface AffiliateProfile {
  id: string;
  email: string;
  name: string | null;
  cpf: string | null;
  status: string;
  tenantAffiliates: {
    id: string;
    type: string;
    commissionPercent: number;
    tenant: { id: string; name: string };
  }[];
}

export default function AffiliateCommissionsPage() {
  const t = useTranslations();
  const ta = useTranslations('affiliate');

  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isAffiliate, setIsAffiliate] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, commissionsRes] = await Promise.all([
          api.get('/affiliates/my/profile'),
          api.get(`/affiliates/my/commissions?page=${page}&limit=20`),
        ]);
        setProfile(profileRes.data);
        setCommissions(commissionsRes.data.data || commissionsRes.data);
        setTotal(commissionsRes.data.total || 0);
      } catch {
        setIsAffiliate(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return <div className="p-6">{t('common.loading')}</div>;
  }

  if (!isAffiliate) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{ta('commissionsTitle')}</h1>
        <p className="text-gray-500">{ta('notAffiliate')}</p>
      </div>
    );
  }

  const totalEarnings = commissions
    .filter((c) => c.status === 'PAID')
    .reduce((sum, c) => sum + c.amountCents, 0);
  const pendingEarnings = commissions
    .filter((c) => c.status === 'PENDING')
    .reduce((sum, c) => sum + c.amountCents, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{ta('commissionsTitle')}</h1>
      <p className="text-gray-500 mb-6">{ta('commissionsDescription')}</p>

      {/* Profile card */}
      {profile && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{profile.name || profile.email}</h2>
              <p className="text-sm text-gray-500">{profile.email}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              profile.status === 'ACTIVE'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {profile.status === 'ACTIVE' ? ta('statusActive') : ta('statusPending')}
            </span>
          </div>

          {/* Linked tenants */}
          {profile.tenantAffiliates.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{ta('linkedCompanies')}</h3>
              <div className="space-y-2">
                {profile.tenantAffiliates.map((link) => (
                  <div key={link.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900">{link.tenant.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        link.type === 'PARTNER'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {link.type === 'PARTNER' ? ta('typePartner') : ta('typeStandard')}
                      </span>
                      <span className="text-gray-500">{link.commissionPercent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{ta('totalEarnings')}</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEarnings)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{ta('pendingEarnings')}</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingEarnings)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">{ta('totalTransactions')}</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
      </div>

      {/* Commissions table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{ta('commissionHistory')}</h2>
        </div>

        {commissions.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            {ta('noCommissions')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{ta('company')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{ta('period')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">{ta('rate')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">{ta('amount')}</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{c.tenant?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.periodStart && c.periodEnd
                        ? `${formatDate(c.periodStart)} - ${formatDate(c.periodEnd)}`
                        : formatDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{c.commissionPercent}%</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(c.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === 'PAID'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {c.status === 'PAID' ? ta('statusPaid') : ta('statusPendingPayment')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="p-4 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {t('common.previous')}
            </button>
            <span className="text-sm text-gray-500">
              {t('common.page')} {page}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={commissions.length < 20}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {t('common.next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
