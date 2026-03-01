'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useState } from 'react';

const features = [
  { key: 'products', color: 'bg-blue-100 text-blue-600' },
  { key: 'invoices', color: 'bg-emerald-100 text-emerald-600' },
  { key: 'serviceOrders', color: 'bg-cyan-100 text-cyan-600' },
  { key: 'nfse', color: 'bg-violet-100 text-violet-600' },
  { key: 'multiTenant', color: 'bg-amber-100 text-amber-600' },
  { key: 'reports', color: 'bg-rose-100 text-rose-600' },
] as const;

const featureIcons: Record<string, JSX.Element> = {
  products: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  ),
  invoices: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  serviceOrders: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75M3.375 14.25V3.375c0-.621.504-1.125 1.125-1.125h9.75" />
    </svg>
  ),
  nfse: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
    </svg>
  ),
  multiTenant: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
    </svg>
  ),
  reports: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  ),
};

export default function LandingPage() {
  const t = useTranslations('landing');
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Flex<span className="text-blue-600">Catalog</span></span>
            </div>

            {/* Desktop: flags + buttons */}
            <div className="hidden md:flex items-center gap-4">
              <LanguageSwitcher />
              <div className="w-px h-6 bg-gray-200" />
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                {t('login')}
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30"
              >
                {t('createAccount')}
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {mobileMenu ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenu && (
            <div className="md:hidden border-t border-gray-100 py-4 space-y-3">
              <div className="flex justify-center">
                <LanguageSwitcher />
              </div>
              <Link href="/login" className="block text-center py-2 text-gray-700 font-medium">
                {t('login')}
              </Link>
              <Link href="/register" className="block text-center py-2.5 mx-4 bg-blue-600 text-white font-semibold rounded-xl">
                {t('createAccount')}
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-100">{t('freeTrialBadge')}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
              FlexCatalog
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
              {t('heroSubtitle')}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="group px-8 py-4 text-base font-semibold text-blue-700 bg-white rounded-xl hover:bg-blue-50 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2"
              >
                {t('startFree')}
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <a
                href="#pricing"
                className="px-8 py-4 text-base font-semibold text-white border-2 border-white/25 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                {t('seePricing')}
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap justify-center gap-6 text-blue-200 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                SSL
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
                Stripe
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                Multi-tenant
              </div>
            </div>
          </div>
        </div>
        {/* Wave divider */}
        <div className="relative">
          <svg viewBox="0 0 1440 60" className="w-full h-auto" preserveAspectRatio="none">
            <path fill="#F9FAFB" d="M0,32L60,37.3C120,43,240,53,360,53.3C480,53,600,43,720,37.3C840,32,960,32,1080,34.7C1200,37,1320,43,1380,45.3L1440,48L1440,60L1380,60C1320,60,1200,60,1080,60C960,60,840,60,720,60C600,60,480,60,360,60C240,60,120,60,60,60L0,60Z" />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Features</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-900">
              {t('featuresTitle')}
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              {t('featuresSubtitle')}
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="group bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.color} mb-5`}>
                  {featureIcons[feature.key]}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {t(`features.${feature.key}.title`)}
                </h3>
                <p className="mt-2 text-gray-500 leading-relaxed">
                  {t(`features.${feature.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Pricing</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-900">
              {t('pricingTitle')}
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              {t('pricingSubtitle')}
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto items-start">
            {/* Trial */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-gray-200 transition-all">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-green-600 uppercase tracking-wide">
                  {t('pricing.trial.label')}
                </span>
              </div>
              <div className="mb-1">
                <span className="text-5xl font-extrabold text-gray-900">{t('pricing.trial.price')}</span>
              </div>
              <div className="text-sm text-gray-500 mb-8">{t('pricing.trial.period')}</div>
              <ul className="space-y-3 mb-8">
                {['feature1', 'feature2', 'feature3'].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-600">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {t(`pricing.trial.${f}`)}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full py-3 text-center font-semibold text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
              >
                {t('startFree')}
              </Link>
            </div>

            {/* Discount — Popular */}
            <div className="relative bg-gradient-to-b from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-2xl shadow-blue-600/30 md:-mt-4 md:mb-0">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide shadow-lg">
                  {t('pricing.discount.badge')}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-4 mt-2">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-blue-200 uppercase tracking-wide">
                  {t('pricing.discount.label')}
                </span>
              </div>
              <div className="mb-1">
                <span className="text-5xl font-extrabold">{t('pricing.discount.price')}</span>
                <span className="text-lg text-blue-200">/{t('pricing.perMonth')}</span>
              </div>
              <div className="text-sm text-blue-200 mb-1">{t('pricing.discount.period')}</div>
              <div className="text-sm text-blue-300 line-through mb-8">{t('pricing.full.price')}/{t('pricing.perMonth')}</div>
              <ul className="space-y-3 mb-8">
                {['feature1', 'feature2', 'feature3'].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-blue-50">
                    <svg className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {t(`pricing.discount.${f}`)}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full py-3 text-center font-semibold text-blue-700 bg-white rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                {t('startFree')}
              </Link>
            </div>

            {/* Full */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-gray-200 transition-all">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                  {t('pricing.full.label')}
                </span>
              </div>
              <div className="mb-1">
                <span className="text-5xl font-extrabold text-gray-900">{t('pricing.full.price')}</span>
                <span className="text-lg text-gray-500">/{t('pricing.perMonth')}</span>
              </div>
              <div className="text-sm text-gray-500 mb-8">{t('pricing.full.period')}</div>
              <ul className="space-y-3 mb-8">
                {['feature1', 'feature2', 'feature3'].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-600">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {t(`pricing.full.${f}`)}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full py-3 text-center font-semibold text-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
              >
                {t('startFree')}
              </Link>
            </div>
          </div>

          <p className="mt-8 text-center text-gray-400 text-sm">{t('couponHint')}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">{t('ctaTitle')}</h2>
          <p className="mt-4 text-lg text-blue-100 max-w-xl mx-auto">{t('ctaSubtitle')}</p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 px-10 py-4 text-lg font-semibold text-blue-700 bg-white rounded-xl hover:bg-blue-50 transition-all shadow-xl shadow-black/10"
          >
            {t('createAccount')}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </div>
              <span className="text-sm text-gray-300 font-medium">FlexCatalog</span>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} FlexCatalog. {t('allRightsReserved')}</p>
            <LanguageSwitcher />
          </div>
        </div>
      </footer>
    </div>
  );
}
