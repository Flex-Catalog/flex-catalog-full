'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface CouponResult {
  code: string;
  discountPercent: number;
  durationMonths: number;
}

interface AffiliateEntry {
  identifier: string;
  type: 'STANDARD' | 'PARTNER';
}

export default function RegisterPage() {
  const t = useTranslations();
  const tl = useTranslations('landing.register');
  const ta = useTranslations('affiliate');
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    taxId: '',
    country: 'BR',
    couponCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState('');

  // Affiliate state
  const [affiliates, setAffiliates] = useState<AffiliateEntry[]>([]);
  const [newAffIdentifier, setNewAffIdentifier] = useState('');
  const [newAffType, setNewAffType] = useState<'STANDARD' | 'PARTNER'>('STANDARD');

  const handleApplyCoupon = async () => {
    if (!formData.couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponResult(null);

    try {
      const response = await api.post('/coupons/validate', {
        code: formData.couponCode,
      });
      setCouponResult(response.data);
    } catch {
      setCouponError(tl('couponInvalid'));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleAddAffiliate = () => {
    if (!newAffIdentifier.trim() || affiliates.length >= 2) return;
    setAffiliates((prev) => [
      ...prev,
      { identifier: newAffIdentifier.trim(), type: newAffType },
    ]);
    setNewAffIdentifier('');
    setNewAffType('STANDARD');
  };

  const handleRemoveAffiliate = (index: number) => {
    setAffiliates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        taxId: formData.taxId,
        country: formData.country,
        ...(couponResult ? { couponCode: formData.couponCode } : {}),
        ...(affiliates.length > 0 ? { affiliates } : {}),
        ...(inviteToken ? { inviteToken } : {}),
      };

      const response = await api.post('/auth/register', payload);
      const { checkoutUrl } = response.data;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            FlexCatalog
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            {t('auth.register')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('landing.freeTrialBadge')}
          </p>
        </div>

        {inviteToken && (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-200 mb-4">
            {ta('inviteMessage')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.name')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => update('name', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => update('email', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.password')}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => update('password', e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tl('companyName')}
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => update('companyName', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {/* Tax ID (CPF/CNPJ) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tl('taxId')}
            </label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => update('taxId', e.target.value)}
              placeholder={tl('taxIdPlaceholder')}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {/* Affiliates Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {ta('title')} <span className="text-gray-400 font-normal">({ta('optional')})</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">{ta('description')}</p>

            {/* Added affiliates */}
            {affiliates.map((aff, index) => (
              <div
                key={index}
                className="flex items-center gap-2 mb-2 bg-gray-50 p-2 rounded-lg"
              >
                <span className="flex-1 text-sm truncate">{aff.identifier}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  aff.type === 'PARTNER'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {aff.type === 'PARTNER' ? ta('typePartner') : ta('typeStandard')}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAffiliate(index)}
                  className="text-red-500 text-xs hover:underline"
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}

            {/* Add new affiliate */}
            {affiliates.length < 2 && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newAffIdentifier}
                    onChange={(e) => setNewAffIdentifier(e.target.value)}
                    placeholder={ta('identifierPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                <select
                  value={newAffType}
                  onChange={(e) => setNewAffType(e.target.value as 'STANDARD' | 'PARTNER')}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="STANDARD">{ta('typeStandard')}</option>
                  <option value="PARTNER">{ta('typePartner')}</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddAffiliate}
                  disabled={!newAffIdentifier.trim()}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {ta('add')}
                </button>
              </div>
            )}

            {affiliates.length >= 2 && (
              <p className="text-xs text-amber-600 mt-2">{ta('maxReached')}</p>
            )}
          </div>

          {/* Coupon Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tl('couponCode')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.couponCode}
                onChange={(e) => {
                  update('couponCode', e.target.value.toUpperCase());
                  setCouponResult(null);
                  setCouponError('');
                }}
                placeholder={tl('couponCodePlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponLoading || !formData.couponCode.trim()}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {couponLoading ? '...' : tl('applyCoupon')}
              </button>
            </div>
            {couponResult && (
              <p className="mt-1 text-sm text-green-600">
                {tl('couponApplied', {
                  discount: couponResult.discountPercent,
                  months: couponResult.durationMonths,
                })}
              </p>
            )}
            {couponError && (
              <p className="mt-1 text-sm text-red-600">{couponError}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? t('common.loading') : t('landing.createAccount')}
          </button>

          <p className="text-xs text-gray-400 text-center">
            {tl('termsAgree')}
          </p>
        </form>

        {/* Login link */}
        <div className="mt-6 text-center text-sm text-gray-600">
          {tl('haveAccount')}{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            {tl('loginLink')}
          </Link>
        </div>
      </div>
    </div>
  );
}
