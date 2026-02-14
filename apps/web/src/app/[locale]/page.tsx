'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

const features = [
  { icon: '📦', key: 'products' },
  { icon: '🧾', key: 'invoices' },
  { icon: '🚢', key: 'serviceOrders' },
  { icon: '📄', key: 'nfse' },
  { icon: '🏢', key: 'multiTenant' },
  { icon: '📊', key: 'reports' },
] as const;

const pricingSteps = ['trial', 'discount', 'full'] as const;

export default function LandingPage() {
  const t = useTranslations('landing');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">FlexCatalog</div>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-5 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              {t('login')}
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('createAccount')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            FlexCatalog
          </h1>
          <p className="mt-4 text-xl sm:text-2xl text-blue-100 max-w-3xl mx-auto">
            {t('heroSubtitle')}
          </p>
          <div className="mt-8 inline-flex items-center bg-white/15 backdrop-blur-sm rounded-full px-6 py-3">
            <span className="text-lg sm:text-xl font-semibold text-yellow-300">
              {t('freeTrialBadge')}
            </span>
          </div>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 text-lg font-semibold text-blue-700 bg-white rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              {t('startFree')}
            </Link>
            <a
              href="#pricing"
              className="px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-lg hover:bg-white/10 transition-colors"
            >
              {t('seePricing')}
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900">
            {t('featuresTitle')}
          </h2>
          <p className="mt-4 text-lg text-center text-gray-600 max-w-2xl mx-auto">
            {t('featuresSubtitle')}
          </p>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t(`features.${feature.key}.title`)}
                </h3>
                <p className="mt-2 text-gray-600">
                  {t(`features.${feature.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900">
            {t('pricingTitle')}
          </h2>
          <p className="mt-4 text-lg text-center text-gray-600 max-w-2xl mx-auto">
            {t('pricingSubtitle')}
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Trial */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 text-center">
              <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                {t('pricing.trial.label')}
              </div>
              <div className="mt-4">
                <span className="text-5xl font-extrabold text-gray-900">
                  {t('pricing.trial.price')}
                </span>
              </div>
              <div className="mt-2 text-gray-500">{t('pricing.trial.period')}</div>
              <ul className="mt-8 space-y-3 text-left">
                <li className="flex items-start gap-2 text-gray-700">
                  <span className="text-green-500 mt-0.5">&#10003;</span>
                  {t('pricing.trial.feature1')}
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <span className="text-green-500 mt-0.5">&#10003;</span>
                  {t('pricing.trial.feature2')}
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <span className="text-green-500 mt-0.5">&#10003;</span>
                  {t('pricing.trial.feature3')}
                </li>
              </ul>
              <Link
                href="/register"
                className="mt-8 block w-full py-3 text-center font-semibold text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {t('startFree')}
              </Link>
            </div>

            {/* Discount */}
            <div className="bg-blue-600 rounded-2xl p-8 text-center text-white relative shadow-xl scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1 rounded-full uppercase">
                {t('pricing.discount.badge')}
              </div>
              <div className="text-sm font-semibold text-blue-200 uppercase tracking-wide">
                {t('pricing.discount.label')}
              </div>
              <div className="mt-4">
                <span className="text-5xl font-extrabold">$250</span>
                <span className="text-xl text-blue-200">/{t('pricing.perMonth')}</span>
              </div>
              <div className="mt-2 text-blue-200">{t('pricing.discount.period')}</div>
              <div className="mt-1 text-sm text-blue-300 line-through">
                $500/{t('pricing.perMonth')}
              </div>
              <ul className="mt-8 space-y-3 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-0.5">&#10003;</span>
                  {t('pricing.discount.feature1')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-0.5">&#10003;</span>
                  {t('pricing.discount.feature2')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 mt-0.5">&#10003;</span>
                  {t('pricing.discount.feature3')}
                </li>
              </ul>
              <Link
                href="/register"
                className="mt-8 block w-full py-3 text-center font-semibold text-blue-700 bg-white rounded-lg hover:bg-blue-50 transition-colors"
              >
                {t('startFree')}
              </Link>
            </div>

            {/* Full */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 text-center">
              <div className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                {t('pricing.full.label')}
              </div>
              <div className="mt-4">
                <span className="text-5xl font-extrabold text-gray-900">$500</span>
                <span className="text-xl text-gray-500">/{t('pricing.perMonth')}</span>
              </div>
              <div className="mt-2 text-gray-500">{t('pricing.full.period')}</div>
              <ul className="mt-8 space-y-3 text-left">
                <li className="flex items-start gap-2 text-gray-700">
                  <span className="text-green-500 mt-0.5">&#10003;</span>
                  {t('pricing.full.feature1')}
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <span className="text-green-500 mt-0.5">&#10003;</span>
                  {t('pricing.full.feature2')}
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <span className="text-green-500 mt-0.5">&#10003;</span>
                  {t('pricing.full.feature3')}
                </li>
              </ul>
              <Link
                href="/register"
                className="mt-8 block w-full py-3 text-center font-semibold text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {t('startFree')}
              </Link>
            </div>
          </div>

          {/* Coupon hint */}
          <p className="mt-8 text-center text-gray-500 text-sm">
            {t('couponHint')}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold">{t('ctaTitle')}</h2>
          <p className="mt-4 text-lg text-blue-100">{t('ctaSubtitle')}</p>
          <Link
            href="/register"
            className="mt-8 inline-block px-10 py-4 text-lg font-semibold text-blue-700 bg-white rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
          >
            {t('createAccount')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} FlexCatalog. {t('allRightsReserved')}</p>
        </div>
      </footer>
    </div>
  );
}
