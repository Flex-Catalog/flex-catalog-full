'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import Cookies from 'js-cookie';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface CouponResult {
  code: string;
  discountPercent: number;
  durationMonths: number;
}

interface AffiliateEntry {
  identifier: string;
  type: 'STANDARD';
}

export default function RegisterPage() {
  const t = useTranslations();
  const tl = useTranslations('landing.register');
  const ta = useTranslations('affiliate');
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';

  const [accountType, setAccountType] = useState<'company' | 'affiliate'>('company');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    taxId: '',
    cpf: '',
    country: 'BR',
    couponCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [affiliates, setAffiliates] = useState<AffiliateEntry[]>([]);
  const [newAffIdentifier, setNewAffIdentifier] = useState('');

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
      { identifier: newAffIdentifier.trim(), type: 'STANDARD' },
    ]);
    setNewAffIdentifier('');
  };

  const handleRemoveAffiliate = (index: number) => {
    setAffiliates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const isAffiliate = accountType === 'affiliate';
      const payload: any = {
        accountType,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        ...(isAffiliate ? {} : {
          companyName: formData.companyName,
          taxId: formData.taxId,
          country: formData.country,
          ...(couponResult ? { couponCode: formData.couponCode } : {}),
          ...(affiliates.length > 0 ? { affiliates } : {}),
          ...(inviteToken ? { inviteToken } : {}),
        }),
        ...(isAffiliate && formData.cpf ? { cpf: formData.cpf } : {}),
      };

      const response = await api.post('/auth/register', payload);
      const { tokens, checkoutUrl } = response.data;

      // Save tokens so user is logged in
      if (tokens) {
        Cookies.set('accessToken', tokens.accessToken);
        Cookies.set('refreshToken', tokens.refreshToken);
      }

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        router.push('/app');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen flex font-sans antialiased">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col justify-center px-12 xl:px-16">
          <Link href="/" className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">FlexCatalog</span>
          </Link>
          <h2 className="text-3xl font-bold text-white leading-tight mb-6">
            {t('landing.heroSubtitle')}
          </h2>

          <div className="space-y-4">
            {[
              { icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', text: t('landing.pricing.trial.feature1') },
              { icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', text: t('landing.pricing.trial.feature2') },
              { icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', text: t('landing.pricing.trial.feature3') },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-blue-100">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
          <LanguageSwitcher />
        </div>

        <div className="flex-1 flex items-center justify-center py-8 px-4 sm:px-8">
          <div className="w-full max-w-lg">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-6">
              <Link href="/" className="inline-flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-gray-900">Flex<span className="text-blue-600">Catalog</span></span>
              </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('auth.register')}</h1>
              <p className="text-sm text-gray-500 mb-4">
                {accountType === 'affiliate'
                  ? t('auth.affiliateRegisterDesc')
                  : t('landing.freeTrialBadge')}
              </p>

              {/* Account type toggle */}
              <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setAccountType('company')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    accountType === 'company'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('auth.accountTypeCompany')}
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('affiliate')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    accountType === 'affiliate'
                      ? 'bg-white text-rose-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('auth.accountTypeAffiliate')}
                </button>
              </div>

              {inviteToken && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-xl text-sm border border-green-100 mb-4">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {ta('inviteMessage')}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-100">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    {error}
                  </div>
                )}

                {/* Name + Email row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.name')}</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => update('name', e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.email')}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => update('email', e.target.value)}
                      required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.password')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => update('password', e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-3 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* CPF for affiliate accounts */}
                {accountType === 'affiliate' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      CPF <span className="text-gray-400 font-normal text-xs">({ta('optional')})</span>
                    </label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) => update('cpf', e.target.value)}
                      placeholder={ta('cpfPlaceholder')}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                    />
                  </div>
                )}

                {/* Company + Tax ID (company only) */}
                {accountType === 'company' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{tl('companyName')}</label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => update('companyName', e.target.value)}
                        required
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{tl('taxId')}</label>
                      <input
                        type="text"
                        value={formData.taxId}
                        onChange={(e) => update('taxId', e.target.value)}
                        placeholder={tl('taxIdPlaceholder')}
                        required
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Affiliates (company only) */}
                {accountType === 'company' && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      {ta('title')} <span className="text-gray-400 font-normal text-xs">({ta('optional')})</span>
                    </label>
                    <span className="text-xs text-gray-400">{affiliates.length}/2</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{ta('description')}</p>

                  {affiliates.map((aff, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2 bg-white p-2.5 rounded-lg border border-gray-100">
                      <span className="flex-1 text-sm truncate text-gray-700">{aff.identifier}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                        {ta('typeStandard')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAffiliate(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  {affiliates.length < 2 && (
                    <div className="flex gap-2 items-end">
                      <input
                        type="text"
                        value={newAffIdentifier}
                        onChange={(e) => setNewAffIdentifier(e.target.value)}
                        placeholder={ta('identifierPlaceholder')}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddAffiliate}
                        disabled={!newAffIdentifier.trim()}
                        className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 disabled:opacity-40 transition-colors font-medium"
                      >
                        {ta('add')}
                      </button>
                    </div>
                  )}

                  {affiliates.length >= 2 && (
                    <p className="text-xs text-amber-600 mt-2">{ta('maxReached')}</p>
                  )}
                </div>
                )}

                {/* Coupon (company only) */}
                {accountType === 'company' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{tl('couponCode')}</label>
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
                      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !formData.couponCode.trim()}
                      className="px-4 py-2.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
                    >
                      {couponLoading ? '...' : tl('applyCoupon')}
                    </button>
                  </div>
                  {couponResult && (
                    <p className="mt-1.5 text-sm text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {tl('couponApplied', {
                        discount: couponResult.discountPercent,
                        months: couponResult.durationMonths,
                      })}
                    </p>
                  )}
                  {couponError && (
                    <p className="mt-1.5 text-sm text-red-500">{couponError}</p>
                  )}
                </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('common.loading')}
                    </>
                  ) : (
                    t('landing.createAccount')
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center">{tl('termsAgree')}</p>
              </form>

              <div className="mt-6 text-center text-sm text-gray-500">
                {tl('haveAccount')}{' '}
                <Link href="/login" className="text-blue-600 font-medium hover:text-blue-700">
                  {tl('loginLink')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
