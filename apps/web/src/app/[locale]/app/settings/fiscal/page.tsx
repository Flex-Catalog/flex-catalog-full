'use client';

import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { useEffect, useRef, useState } from 'react';

interface FiscalConfigForm {
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  codigoMunicipio: string;
  regimeTributario: string;
  itemListaServico: string;
  aliquotaISS: string;
  cnaeCode: string;
  codigoTributacaoMunicipal: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
}

export default function FiscalSettingsPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [certSaved, setCertSaved] = useState(false);
  const [certError, setCertError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset } = useForm<FiscalConfigForm>();

  const { data: config, isLoading } = useQuery({
    queryKey: ['fiscal-config'],
    queryFn: async () => {
      const res = await api.get('/tenants/fiscal-config');
      return res.data;
    },
  });

  useEffect(() => {
    if (config) {
      reset({
        razaoSocial: config.razaoSocial ?? '',
        nomeFantasia: config.nomeFantasia ?? '',
        inscricaoEstadual: config.inscricaoEstadual ?? '',
        inscricaoMunicipal: config.inscricaoMunicipal ?? '',
        codigoMunicipio: config.codigoMunicipio ?? '',
        regimeTributario: String(config.regimeTributario ?? '1'),
        itemListaServico: config.itemListaServico ?? '',
        aliquotaISS: String(config.aliquotaISS ?? '5'),
        cnaeCode: config.cnaeCode ?? '',
        codigoTributacaoMunicipal: config.codigoTributacaoMunicipal ?? '',
        logradouro: config.logradouro ?? '',
        numero: config.numero ?? '',
        complemento: config.complemento ?? '',
        bairro: config.bairro ?? '',
        municipio: config.municipio ?? '',
        uf: config.uf ?? '',
        cep: config.cep ?? '',
      });
    }
  }, [config, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: FiscalConfigForm) => {
      const res = await api.patch('/tenants/fiscal-config', {
        ...data,
        regimeTributario: parseInt(data.regimeTributario, 10),
        aliquotaISS: parseFloat(data.aliquotaISS),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-config'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const { data: certStatus } = useQuery({
    queryKey: ['cert-status'],
    queryFn: async () => {
      const res = await api.get('/tenants/fiscal-config/certificate');
      return res.data as { uploaded: boolean; uploadedAt: string | null };
    },
  });

  const certMutation = useMutation({
    mutationFn: async () => {
      if (!certFile) throw new Error('Selecione o arquivo .pfx');
      const form = new FormData();
      form.append('arquivo', certFile);
      form.append('senha', certPassword);
      const res = await api.post('/tenants/fiscal-config/certificate', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cert-status'] });
      setCertSaved(true);
      setCertFile(null);
      setCertPassword('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setCertSaved(false), 4000);
    },
    onError: (err: any) => {
      setCertError(err?.response?.data?.message || err?.message || t('common.error'));
      setTimeout(() => setCertError(''), 5000);
    },
  });

  if (isLoading) {
    return <div className="text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.fiscalTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('settings.fiscalDesc')}</p>
      </div>

      {/* Platform NFS-e Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-sm">
        <p className="font-semibold text-green-800 mb-1">{t('settings.platformNfseInfo')}</p>
        <p className="text-green-700">{t('settings.platformNfseInfoDesc')}</p>
      </div>

      {saved && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">
          {t('settings.savedSuccess')}
        </div>
      )}

      {saveMutation.isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {(saveMutation.error as any)?.response?.data?.message || t('common.error')}
        </div>
      )}

      <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">

        {/* Dados do Emitente */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('settings.issuerData')}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.razaoSocial')} *
                </label>
                <input
                  {...register('razaoSocial')}
                  placeholder="Nome da empresa conforme CNPJ"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.nomeFantasia')}
                </label>
                <input
                  {...register('nomeFantasia')}
                  placeholder="Nome fantasia (opcional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.regimeTributario')}
                </label>
                <select
                  {...register('regimeTributario')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Simples Nacional</option>
                  <option value="2">ME/EPP — Simples Nacional (ISSQN)</option>
                  <option value="3">Regime Normal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.inscricaoEstadual')}
                </label>
                <input
                  {...register('inscricaoEstadual')}
                  placeholder="Inscrição Estadual"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.inscricaoMunicipal')}
                </label>
                <input
                  {...register('inscricaoMunicipal')}
                  placeholder="Inscrição Municipal (para NFS-e)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.codigoMunicipio')}
                </label>
                <input
                  {...register('codigoMunicipio')}
                  placeholder="Ex: 3550308 (São Paulo)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">{t('settings.codigoMunicipioHelp')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.cnaeCode')}
                </label>
                <input
                  {...register('cnaeCode')}
                  placeholder="Ex: 5091-2/01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Endereço do Emitente */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('settings.issuerAddress')}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.logradouro')}</label>
                <input
                  {...register('logradouro')}
                  placeholder="Rua, Avenida, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.numero')}</label>
                <input
                  {...register('numero')}
                  placeholder="Nº"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.complemento')}</label>
                <input
                  {...register('complemento')}
                  placeholder="Sala, Andar, etc. (opcional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.bairro')}</label>
                <input
                  {...register('bairro')}
                  placeholder="Bairro"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.cep')}</label>
                <input
                  {...register('cep')}
                  placeholder="00000-000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.municipio')}</label>
                <input
                  {...register('municipio')}
                  placeholder="Cidade"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.uf')}</label>
                <select
                  {...register('uf')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">UF</option>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* NFS-e Configuração */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">{t('settings.nfseConfig')}</h2>
          <p className="text-xs text-gray-500 mb-4">{t('settings.nfseConfigDesc')}</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.itemListaServico')}
                </label>
                <input
                  {...register('itemListaServico')}
                  placeholder="Ex: 16.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">{t('settings.itemListaServicoHelp')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.aliquotaISS')}
                </label>
                <input
                  {...register('aliquotaISS')}
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  placeholder="Ex: 5.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">{t('settings.aliquotaISSHelp')}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.codigoTributacaoMunicipal')}
              </label>
              <input
                {...register('codigoTributacaoMunicipal')}
                placeholder="Código de tributação municipal (opcional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {saveMutation.isPending ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>

      {/* Certificado Digital */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mt-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900">{t('settings.certTitle')}</h2>
          {certStatus?.uploaded ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {t('settings.certConfigured')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              {t('settings.certNotConfigured')}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-4">{t('settings.certDesc')}</p>

        {certStatus?.uploaded && certStatus.uploadedAt && (
          <p className="text-xs text-gray-400 mb-4">
            {t('settings.certLastUpload')}: {new Date(certStatus.uploadedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {certSaved && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">
            {t('settings.certUploadSuccess')}
          </div>
        )}
        {certError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {certError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.certFile')}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pfx,.p12"
              onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.certPassword')}
            </label>
            <input
              type="password"
              value={certPassword}
              onChange={(e) => setCertPassword(e.target.value)}
              placeholder="Senha do certificado .pfx"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            disabled={certMutation.isPending || !certFile || !certPassword}
            onClick={() => certMutation.mutate()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {certMutation.isPending ? t('settings.certUploading') : t('settings.certUpload')}
          </button>
        </div>
      </div>
    </div>
  );
}
