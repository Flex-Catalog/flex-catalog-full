'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  entityName?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface AuditStats {
  total: number;
  byAction: Array<{ action: string; count: number }>;
  byEntity: Array<{ entity: string; count: number }>;
  byUser: Array<{ user: { id: string; name: string; email: string }; count: number }>;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  ISSUE: 'bg-purple-100 text-purple-800',
  CANCEL: 'bg-orange-100 text-orange-800',
  LOGIN: 'bg-gray-100 text-gray-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
};

const ACTION_ICONS: Record<string, string> = {
  CREATE: '+',
  UPDATE: '~',
  DELETE: 'x',
  ISSUE: '#',
  CANCEL: '!',
  LOGIN: '>',
  LOGOUT: '<',
};

export default function AuditPage() {
  const t = useTranslations();
  const [filters, setFilters] = useState({
    action: '',
    entity: '',
    page: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', filters.page.toString());
      params.set('limit', '25');
      if (filters.action) params.set('action', filters.action);
      if (filters.entity) params.set('entity', filters.entity);

      const res = await api.get(`/audit?${params.toString()}`);
      return res.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const res = await api.get('/audit/stats?days=30');
      return res.data as AuditStats;
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const renderChanges = (log: AuditLog) => {
    if (!log.oldData && !log.newData) return null;

    if (log.action === 'CREATE' && log.newData) {
      return (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            {t('audit.viewDetails')}
          </summary>
          <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(log.newData, null, 2)}
          </pre>
        </details>
      );
    }

    if (log.action === 'DELETE' && log.oldData) {
      return (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            {t('audit.viewDeleted')}
          </summary>
          <pre className="mt-1 text-xs bg-red-50 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(log.oldData, null, 2)}
          </pre>
        </details>
      );
    }

    if (log.action === 'UPDATE' && log.oldData && log.newData) {
      return (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            {t('audit.viewChanges')}
          </summary>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">{t('audit.before')}</div>
              <pre className="text-xs bg-red-50 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(log.oldData, null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">{t('audit.after')}</div>
              <pre className="text-xs bg-green-50 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(log.newData, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      );
    }

    return null;
  };

  if (isLoading) {
    return <div className="p-6">{t('common.loading')}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('audit.title')}</h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">{t('audit.totalActions')}</div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-400">{t('audit.last30Days')}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">{t('audit.byAction')}</div>
            <div className="mt-2 space-y-1">
              {stats.byAction.slice(0, 3).map((item) => (
                <div key={item.action} className="flex justify-between text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs ${ACTION_COLORS[item.action] || 'bg-gray-100'}`}>
                    {item.action}
                  </span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">{t('audit.byEntity')}</div>
            <div className="mt-2 space-y-1">
              {stats.byEntity.slice(0, 3).map((item) => (
                <div key={item.entity} className="flex justify-between text-sm">
                  <span>{item.entity}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">{t('audit.topUsers')}</div>
            <div className="mt-2 space-y-1">
              {stats.byUser.slice(0, 3).map((item) => (
                <div key={item.user?.id} className="flex justify-between text-sm">
                  <span className="truncate max-w-[120px]">{item.user?.name}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('audit.filterAction')}
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">{t('common.all')}</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="ISSUE">ISSUE</option>
              <option value="CANCEL">CANCEL</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('audit.filterEntity')}
            </label>
            <select
              value={filters.entity}
              onChange={(e) => setFilters({ ...filters, entity: e.target.value, page: 1 })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">{t('common.all')}</option>
              <option value="Product">Product</option>
              <option value="Category">Category</option>
              <option value="Invoice">Invoice</option>
              <option value="User">User</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log List */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {data?.data?.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              {t('audit.noLogs')}
            </div>
          )}

          {data?.data?.map((log: AuditLog) => (
            <div key={log.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${ACTION_COLORS[log.action] || 'bg-gray-100'}`}>
                    {ACTION_ICONS[log.action] || '?'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100'}`}>
                        {log.action}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {log.entity}
                      </span>
                      {log.entityName && (
                        <span className="text-sm text-gray-500">
                          - {log.entityName}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {t('audit.by')} <span className="font-medium">{log.user.name}</span> ({log.user.email})
                    </div>
                    {renderChanges(log)}
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {formatDate(log.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {t('common.page')} {data.meta.page} {t('common.of')} {data.meta.totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                {t('common.previous')}
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page === data.meta.totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
