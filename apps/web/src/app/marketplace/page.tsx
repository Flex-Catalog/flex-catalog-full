'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function MarketplacePage() {
  const t = useTranslations('Marketplace');
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t('title', { defaultMessage: 'Marketplace' })}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('subtitle', { defaultMessage: 'Encontre os melhores produtos para sua empresa' })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar filtros */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4">{t('filters', { defaultMessage: 'Filtros' })}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('search', { defaultMessage: 'Buscar' })}
                    </label>
                    <input 
                      type="text" 
                      placeholder={t('searchPlaceholder', { defaultMessage: 'Nome do produto...' })}
                      defaultValue={search}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('category', { defaultMessage: 'Categoria' })}
                    </label>
                    <select defaultValue={category} className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="">{t('allCategories', { defaultMessage: 'Todas' })}</option>
                      <option value="eletronicos">Eletrônicos</option>
                      <option value="vestuario">Vestuário</option>
                      <option value="casa">Casa e Cozinha</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('price', { defaultMessage: 'Preço' })}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" placeholder="0" className="p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                      <input type="number" placeholder="1.000" className="p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500" />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        {t('inStockOnly', { defaultMessage: 'Em estoque' })}
                      </span>
                    </label>
                  </div>
                  <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors">
                    {t('applyFilters', { defaultMessage: 'Aplicar Filtros' })}
                  </button>
                  <button className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 font-medium transition-colors">
                    {t('clearFilters', { defaultMessage: 'Limpar' })}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Produtos */}
          <div className="lg:col-span-9">
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex gap-4 items-center">
                <div className="flex-1 max-w-md">
                  <input 
                    type="text" 
                    placeholder={t('searchProducts', { defaultMessage: 'Buscar produtos...' })}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select className="p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500">
                  <option>{t('sortBy', { defaultMessage: 'Ordenar por' })}</option>
                  <option>{t('priceLowHigh', { defaultMessage: 'Preço baixo → alto' })}</option>
                  <option>{t('priceHighLow', { defaultMessage: 'Preço alto → baixo' })}</option>
                  <option>{t('newest', { defaultMessage: 'Mais recente' })}</option>
                  <option>{t('bestSellers', { defaultMessage: 'Mais vendidos' })}</option>
                </select>
              </div>
              <div className="text-sm text-gray-500">
                {t.rich('showing', {
                  count: 24,
                  defaultMessage: 'Mostrando {count} de 156 produtos'
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 12 }, (_, i) => (
                <Link key={i} href="/marketplace/produto/1" className="group">
                  <div className="bg-white rounded-2xl shadow-sm border hover:shadow-md transition-all overflow-hidden hover:-translate-y-1">
                    <div className="h-56 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center group-hover:from-blue-50 group-hover:to-indigo-50">
                      <div className="text-3xl">📦</div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center mb-3">
                        <div className="flex">
                          {[1,2,3,4].map((star) => (
                            <svg key={star} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                              <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.432 8.278-7.374-3.527-7.374 3.527 1.432-8.278-6.064-5.828 8.332-1.151z"/>
                            </svg>
                          ))}
                          <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24">
                            <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.432 8.278-7.374-3.527-7.374 3.527 1.432-8.278-6.064-5.828 8.332-1.151z"/>
                          </svg>
                        </div>
                        <span className="text-sm text-gray-500 ml-1">(47)</span>
                      </div>
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2 leading-tight">
                        Produto Exemplo {i + 1}
                      </h3>
                      <p className="text-2xl font-bold text-gray-900 mb-3">R$ {Math.floor(Math.random()*100) + 29},90</p>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                          Em estoque
                        </span>
                        <span className="text-sm text-gray-500">
                          {Math.floor(Math.random()*99) + 1} vendidos
                        </span>
                      </div>
                      <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all">
                        🛒 Adicionar ao Carrinho
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Paginação */}
            <div className="flex justify-center mt-12">
              <div className="flex gap-1 bg-white p-2 rounded-xl shadow-sm border">
                <button className="px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">«</button>
                {[1,2,3,4,5].map((page) => (
                  <button key={page} className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                    page === 2 ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                  }`}>
                    {page}
                  </button>
                ))}
                <button className="px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">»</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
