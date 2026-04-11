'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function MarketplacePage() {
  const t = useTranslations('Marketplace');

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-xl text-gray-600">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 lg:gap-12">
          {/* Filtros */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-6">{t('filters')}</h3>
              {/* Filtros aqui */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                  <select className="w-full p-2 border rounded-md">
                    <option>Todas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preço</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Mín" className="p-2 border rounded-md" />
                    <input type="number" placeholder="Máx" className="p-2 border rounded-md" />
                  </div>
                </div>
                <button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                  {t('applyFilters')}
                </button>
              </div>
            </div>
          </div>

          {/* Produtos */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder={t('search')}
                  className="p-2 border rounded-md w-64"
                />
                <select className="p-2 border rounded-md">
                  <option>Ordenar por</option>
                  <option>Preço baixo-alto</option>
                  <option>Preço alto-baixo</option>
                  <option>Mais recente</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* ProductCard components */}
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">Produto {i}</h3>
                    <p className="text-2xl font-bold text-blue-600 mb-2">R$ 99,90</p>
                    <div className="flex items-center mb-3">
                      <span className="text-yellow-400">★★★★☆</span>
                      <span className="text-sm text-gray-500 ml-2">(23)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">
                        Adicionar ao Carrinho
                      </button>
                      <span className="text-sm text-green-600 font-medium">Em estoque</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Paginação */}
            <div className="mt-12 flex justify-center">
              <nav className="flex space-x-1">
                {[1,2,3].map((page) => (
                  <button key={page} className="px-3 py-2 border rounded-md">
                    {page}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
