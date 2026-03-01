'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

const SERVICE_TYPES = [
  { value: 'CREW_TRANSPORT', label: 'Condução de Tripulação' },
  { value: 'SUPPLY_TRANSPORT', label: 'Transporte de Suprimentos' },
  { value: 'EQUIPMENT_TRANSPORT', label: 'Transporte de Equipamentos' },
  { value: 'PERSONNEL_TRANSPORT', label: 'Condução de Funcionários' },
  { value: 'INSPECTION', label: 'Inspeção' },
  { value: 'MAINTENANCE_SUPPORT', label: 'Apoio à Manutenção' },
  { value: 'ANCHORING_SUPPORT', label: 'Apoio à Fundeio' },
  { value: 'PILOT_TRANSPORT', label: 'Transporte de Prático' },
  { value: 'CUSTOMS_TRANSPORT', label: 'Transporte Despachante/Alfândega' },
  { value: 'MEDICAL_TRANSPORT', label: 'Transporte Médico' },
  { value: 'OTHER', label: 'Outros' },
];

interface CreateOrderForm {
  serviceType: string;
  serviceDescription: string;
  serviceDate: string;
  startTime: string;
  vesselName: string;
  vesselType: string;
  anchorageArea: string;
  companyName: string;
  companyTaxId: string;
  captainName: string;
  employeeName: string;
  rateCents: number;
  currency: string;
  notes: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  INVOICED: 'bg-purple-100 text-purple-700',
  CANCELED: 'bg-red-100 text-red-700',
};

export default function ServiceOrdersPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [endTime, setEndTime] = useState(new Date().toISOString().slice(0, 16));

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateOrderForm>({
    defaultValues: {
      serviceType: 'CREW_TRANSPORT',
      serviceDescription: '',
      serviceDate: new Date().toISOString().slice(0, 10),
      startTime: new Date().toISOString().slice(0, 16),
      vesselName: '',
      vesselType: 'NATIONAL',
      anchorageArea: '',
      companyName: '',
      companyTaxId: '',
      captainName: '',
      employeeName: '',
      rateCents: 0,
      currency: 'BRL',
      notes: '',
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['service-orders'],
    queryFn: async () => {
      const res = await api.get('/service-orders');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: CreateOrderForm) => {
      const payload = {
        serviceType: formData.serviceType,
        serviceDescription: formData.serviceDescription,
        serviceDate: formData.serviceDate,
        startTime: new Date(formData.startTime).toISOString(),
        vesselName: formData.vesselName,
        vesselType: formData.vesselType,
        anchorageArea: formData.anchorageArea || undefined,
        companyName: formData.companyName,
        companyTaxId: formData.companyTaxId || undefined,
        captainName: formData.captainName || undefined,
        employeeName: formData.employeeName || undefined,
        rateCents: Math.round(formData.rateCents * 100),
        currency: formData.currency,
        notes: formData.notes || undefined,
      };
      const res = await api.post('/service-orders', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      setShowModal(false);
      reset();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || t('common.error'));
    },
  });

  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/service-orders/${id}/start`);
      return res.data;
    },
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || t('common.error');
      setActionError(`Erro ao iniciar: ${msg}`);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, endTimeISO }: { id: string; endTimeISO: string }) => {
      const res = await api.post(`/service-orders/${id}/complete`, { endTime: endTimeISO });
      return res.data;
    },
    onSuccess: () => {
      setActionError('');
      setCompletingId(null);
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || t('common.error');
      setActionError(`Erro ao concluir: ${msg}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/service-orders/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      setActionError('');
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || t('common.error');
      setActionError(`Erro ao cancelar: ${msg}`);
    },
  });

  const onSubmit = (data: CreateOrderForm) => {
    setError('');
    createMutation.mutate(data);
  };

  const openHtmlInNewTab = async (url: string) => {
    try {
      const res = await api.get(url, { responseType: 'text' });
      const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch {
      alert('Erro ao abrir documento.');
    }
  };

  const openReceipt = (id: string) => openHtmlInNewTab(`/service-orders/${id}/receipt`);
  const openNfse = (id: string) => openHtmlInNewTab(`/service-orders/${id}/nfse`);

  if (isLoading) return <div>{t('common.loading')}</div>;

  const orders = data?.data || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('serviceOrders.title')}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {t('serviceOrders.create')}
        </button>
      </div>

      {actionError && (
        <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm">{actionError}</span>
          <button onClick={() => setActionError('')} className="text-red-500 hover:text-red-700 ml-4">✕</button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {t('serviceOrders.noOrders')}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('serviceOrders.number')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('serviceOrders.serviceType')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('serviceOrders.vessel')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('serviceOrders.company')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoices.date')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('invoices.status')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order: any) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {SERVICE_TYPES.find((s) => s.value === order.serviceType)?.label || order.serviceType}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.vesselName}</div>
                      <div className="text-xs text-gray-400">{order.vesselType}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {order.companyName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.serviceDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                      {order.status === 'DRAFT' && (
                        <button
                          onClick={() => { setActionError(''); startMutation.mutate(order.id); }}
                          disabled={startMutation.isPending}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50 font-medium"
                        >
                          {startMutation.isPending ? '...' : t('serviceOrders.start')}
                        </button>
                      )}
                      {order.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => { setEndTime(new Date().toISOString().slice(0, 16)); setCompletingId(order.id); }}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          {t('serviceOrders.complete')}
                        </button>
                      )}
                      {(order.status === 'COMPLETED' || order.status === 'INVOICED') && (
                        <>
                          <button
                            onClick={() => openReceipt(order.id)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            {t('serviceOrders.receipt')}
                          </button>
                          <button
                            onClick={() => openNfse(order.id)}
                            className="text-purple-600 hover:text-purple-800 ml-2"
                          >
                            NFS-e
                          </button>
                        </>
                      )}
                      {(order.status === 'DRAFT' || order.status === 'IN_PROGRESS') && (
                        <button
                          onClick={() => { setActionError(''); cancelMutation.mutate(order.id); }}
                          disabled={cancelMutation.isPending}
                          className="text-red-600 hover:text-red-800 ml-2 disabled:opacity-50"
                        >
                          {t('invoices.cancel')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {orders.map((order: any) => (
              <div key={order.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(order.serviceDate).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 font-medium">{SERVICE_TYPES.find((s) => s.value === order.serviceType)?.label || order.serviceType}</p>
                <p className="text-xs text-gray-500 mt-1">{order.vesselName} · {order.vesselType}</p>
                <p className="text-xs text-gray-500">{order.companyName}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {order.status === 'DRAFT' && (
                    <button
                      onClick={() => { setActionError(''); startMutation.mutate(order.id); }}
                      disabled={startMutation.isPending}
                      className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-medium disabled:opacity-50"
                    >
                      {startMutation.isPending ? '...' : t('serviceOrders.start')}
                    </button>
                  )}
                  {order.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => { setEndTime(new Date().toISOString().slice(0, 16)); setCompletingId(order.id); }}
                      className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium"
                    >
                      {t('serviceOrders.complete')}
                    </button>
                  )}
                  {(order.status === 'COMPLETED' || order.status === 'INVOICED') && (
                    <>
                      <button
                        onClick={() => openReceipt(order.id)}
                        className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full"
                      >
                        {t('serviceOrders.receipt')}
                      </button>
                      <button
                        onClick={() => openNfse(order.id)}
                        className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full"
                      >
                        NFS-e
                      </button>
                    </>
                  )}
                  {(order.status === 'DRAFT' || order.status === 'IN_PROGRESS') && (
                    <button
                      onClick={() => { setActionError(''); cancelMutation.mutate(order.id); }}
                      disabled={cancelMutation.isPending}
                      className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full disabled:opacity-50"
                    >
                      {t('invoices.cancel')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto py-8">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{t('serviceOrders.create')}</h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('serviceOrders.serviceType')} *
                  </label>
                  <select
                    {...register('serviceType', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {SERVICE_TYPES.map((st) => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('serviceOrders.serviceDate')} *
                  </label>
                  <input
                    type="date"
                    {...register('serviceDate', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('serviceOrders.serviceDescription')} *
                </label>
                <textarea
                  {...register('serviceDescription', { required: true })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={t('serviceOrders.serviceDescriptionPlaceholder')}
                />
                {errors.serviceDescription && (
                  <p className="text-red-500 text-xs mt-1">{t('validation.required')}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('serviceOrders.startTime')} *
                  </label>
                  <input
                    type="datetime-local"
                    {...register('startTime', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('serviceOrders.anchorageArea')}
                  </label>
                  <input
                    {...register('anchorageArea')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ex: Fundeadouro de Santos"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('serviceOrders.vessel')} *
                  </label>
                  <input
                    {...register('vesselName', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Nome da embarcação"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('serviceOrders.vesselType')} *
                  </label>
                  <select
                    {...register('vesselType')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="NATIONAL">Nacional</option>
                    <option value="FOREIGN">Estrangeira</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('serviceOrders.company')} *
                  </label>
                  <input
                    {...register('companyName', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Empresa solicitante"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ / Tax ID
                  </label>
                  <input
                    {...register('companyTaxId')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="00.000.000/0001-00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('serviceOrders.captain')}
                  </label>
                  <input
                    {...register('captainName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Nome do comandante"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('serviceOrders.employee')}
                  </label>
                  <input
                    {...register('employeeName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Funcionário responsável"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('serviceOrders.rate')} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('rateCents', { required: true, min: 0, valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('products.currency')}
                  </label>
                  <select
                    {...register('currency')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="BRL">BRL</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('serviceOrders.notes')}
                </label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Observações adicionais..."
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? t('common.saving') : t('serviceOrders.create')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); reset(); setError(''); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Service Modal */}
      {completingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4 text-gray-900">{t('serviceOrders.complete')} serviço</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora de término *</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => completeMutation.mutate({ id: completingId, endTimeISO: new Date(endTime).toISOString() })}
                disabled={completeMutation.isPending || !endTime}
                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {completeMutation.isPending ? t('common.saving') : 'Confirmar'}
              </button>
              <button
                onClick={() => setCompletingId(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
