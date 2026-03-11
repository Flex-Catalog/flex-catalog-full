import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { PrismaService } from '../prisma/prisma.service';
import { TenantStatus, Feature, CountryCode, SupportedLocale } from '@product-catalog/shared';

interface CreateTenantInput {
  name: string;
  country: CountryCode;
  locale?: SupportedLocale;
  features?: Feature[];
  status?: TenantStatus;
  taxId?: string;
  trialEndsAt?: Date;
}

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(input: CreateTenantInput) {
    return this.prisma.tenant.create({
      data: {
        name: input.name,
        country: input.country,
        locale: input.locale || 'en',
        features: input.features || [],
        status: input.status || 'PENDING_PAYMENT',
        taxId: input.taxId,
        trialEndsAt: input.trialEndsAt,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  async findByTaxId(taxId: string) {
    return this.prisma.tenant.findFirst({ where: { taxId } });
  }

  async findByStripeCustomerId(stripeCustomerId: string) {
    return this.prisma.tenant.findFirst({ where: { stripeCustomerId } });
  }

  async updateStatus(id: string, status: TenantStatus) {
    return this.prisma.tenant.update({
      where: { id },
      data: { status },
    });
  }

  async updateStripeInfo(
    id: string,
    data: {
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      currentPeriodEnd?: Date;
      status?: TenantStatus;
    },
  ) {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  async update(id: string, data: Partial<CreateTenantInput>) {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  async count() {
    return this.prisma.tenant.count();
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFiscalConfig(tenantId: string): Promise<Record<string, unknown> | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { fiscalConfig: true },
    });
    return (tenant?.fiscalConfig as Record<string, unknown>) ?? null;
  }

  async updateFiscalConfig(tenantId: string, config: Record<string, unknown>) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { taxId: true },
    });

    const result = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { fiscalConfig: config as any },
      select: { fiscalConfig: true },
    });

    // Auto-register/update the company in Focus NFe (non-blocking)
    if (tenant?.taxId) {
      this.syncTenantWithFocusNfe(tenant.taxId, config).catch(() => {});
    }

    return result;
  }

  /**
   * Automatically registers or updates this tenant's company in Focus NFe
   * using the platform-level token. Called whenever fiscal config changes.
   * Non-blocking — failures are logged but do not affect the response.
   */
  private async syncTenantWithFocusNfe(
    taxId: string,
    fiscal: Record<string, unknown>,
  ): Promise<void> {
    const token = this.configService.get<string>('FOCUS_NFE_TOKEN');
    if (!token) return; // Platform token not configured yet

    const ambiente = this.configService.get<string>('FOCUS_NFE_AMBIENTE') ?? 'homologacao';
    const hostname =
      ambiente === 'producao' ? 'api.focusnfe.com.br' : 'homologacao.focusnfe.com.br';

    const cnpj = taxId.replace(/[.\-\/\s]/g, '');
    if (cnpj.length < 11) return; // Invalid CNPJ

    const body: Record<string, unknown> = {
      nome: fiscal.razaoSocial,
      nome_fantasia: fiscal.nomeFantasia || fiscal.razaoSocial,
      cnpj,
      regime_tributario: fiscal.regimeTributario ?? 1,
      inscricao_estadual: fiscal.inscricaoEstadual || 'ISENTO',
      inscricao_municipal: fiscal.inscricaoMunicipal,
      codigo_municipio: fiscal.codigoMunicipio,
      logradouro: fiscal.logradouro,
      numero: fiscal.numero || 'S/N',
      complemento: fiscal.complemento,
      bairro: fiscal.bairro,
      municipio: fiscal.municipio,
      uf: fiscal.uf,
      cep: String(fiscal.cep ?? '').replace(/\D/g, ''),
      habilita_nfse: true,
      habilita_nfe: false,
    };

    // Remove undefined fields
    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

    try {
      // Try to update first (PUT), fall back to create (POST) if not found
      const putRes = await this.focusNfeRequest(hostname, `/v2/empresas/${cnpj}`, 'PUT', token, body);

      if (putRes.statusCode === 404) {
        // Company doesn't exist yet — create it
        await this.focusNfeRequest(hostname, '/v2/empresas', 'POST', token, body);
        this.logger.log(`Focus NFe: empresa ${cnpj} criada automaticamente`);
      } else {
        this.logger.log(`Focus NFe: empresa ${cnpj} atualizada automaticamente`);
      }
    } catch (err) {
      this.logger.warn(`Focus NFe: falha ao sincronizar empresa ${cnpj}: ${err}`);
    }
  }

  private focusNfeRequest(
    hostname: string,
    path: string,
    method: string,
    token: string,
    body: object,
  ): Promise<{ statusCode: number; body: any }> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${token}:`).toString('base64');
      const bodyStr = JSON.stringify(body);

      const req = https.request(
        {
          hostname,
          path,
          method,
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr),
          },
          timeout: 15000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ statusCode: res.statusCode ?? 0, body: JSON.parse(data) });
            } catch {
              resolve({ statusCode: res.statusCode ?? 0, body: data });
            }
          });
        },
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(bodyStr);
      req.end();
    });
  }

  async getCertificateStatus(tenantId: string): Promise<{ uploaded: boolean; uploadedAt: string | null }> {
    const config = (await this.getFiscalConfig(tenantId)) ?? {};
    return {
      uploaded: !!(config as any).certificateUploaded,
      uploadedAt: (config as any).certificateUploadedAt ?? null,
    };
  }

  async uploadCertificate(tenantId: string, fileBuffer: Buffer, senha: string): Promise<{ success: boolean; sentToFocusNfe: boolean }> {
    const token = this.configService.get<string>('FOCUS_NFE_TOKEN');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { taxId: true, name: true, fiscalConfig: true },
    });

    let sentToFocusNfe = false;

    // Try to send to Focus NFe if token + CNPJ are available
    if (token && tenant?.taxId) {
      const cnpj = tenant.taxId.replace(/[.\-\/\s]/g, '');
      const ambiente = this.configService.get<string>('FOCUS_NFE_AMBIENTE') ?? 'homologacao';
      const hostname = ambiente === 'producao' ? 'api.focusnfe.com.br' : 'homologacao.focusnfe.com.br';
      const fiscal = (tenant.fiscalConfig ?? {}) as Record<string, any>;

      // Ensure empresa is registered on Focus NFe before uploading certificate
      try {
        await this.focusNfeEnsureEmpresa(hostname, cnpj, token, {
          razaoSocial: fiscal.razaoSocial || tenant.name || 'Empresa',
          inscricaoMunicipal: fiscal.inscricaoMunicipal ?? '',
          codigoMunicipio: fiscal.codigoMunicipio ?? '',
          regimeTributario: fiscal.regimeTributario ?? 1,
          nomeFantasia: fiscal.nomeFantasia,
          email: fiscal.email,
          telefone: fiscal.telefone,
          logradouro: fiscal.logradouro,
          numero: fiscal.numero,
          bairro: fiscal.bairro,
          municipio: fiscal.municipio,
          uf: fiscal.uf,
          cep: fiscal.cep,
        });
      } catch (err: any) {
        this.logger.warn(`Empresa não pôde ser registrada no Focus NFe: ${err.message}`);
      }

      try {
        await this.focusNfeUploadCertificate(hostname, cnpj, token, fileBuffer, senha);
        sentToFocusNfe = true;
        this.logger.log(`Certificado digital enviado para Focus NFe: CNPJ ${cnpj}`);
      } catch (err: any) {
        this.logger.warn(`Falha ao enviar certificado para Focus NFe: ${err.message}`);
        // Continue — still save locally so user doesn't lose their upload
      }
    } else {
      this.logger.warn(`Certificado salvo localmente (Focus NFe token ${token ? 'ok' : 'ausente'}, CNPJ ${tenant?.taxId ? 'ok' : 'ausente'})`);
    }

    // Always store the certificate in DB (as base64) so it's available when Focus NFe is configured
    const existing = (await this.getFiscalConfig(tenantId)) ?? {};
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        fiscalConfig: {
          ...existing,
          certificateUploaded: true,
          certificateUploadedAt: new Date().toISOString(),
          certificateBase64: fileBuffer.toString('base64'),
          certificateSenha: senha,
          sentToFocusNfe,
        } as any,
      },
    });

    return { success: true, sentToFocusNfe };
  }

  async getDocumentSettings(tenantId: string): Promise<Record<string, unknown>> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const defaults: Record<string, unknown> = {
      showClientTaxId: true,
      showBoatName: true,
      showPaymentTerms: true,
      showSignatureLine: true,
      showObservations: true,
      showClientAddress: true,
    };
    return { ...defaults, ...((tenant as any)?.documentSettings ?? {}) };
  }

  async updateDocumentSettings(tenantId: string, settings: Record<string, unknown>) {
    const existing = await this.getDocumentSettings(tenantId);
    const merged = { ...existing, ...settings };
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { documentSettings: merged as any },
    });
    return merged;
  }

  private async focusNfeEnsureEmpresa(
    hostname: string,
    cnpj: string,
    token: string,
    data: {
      razaoSocial: string;
      inscricaoMunicipal: string;
      codigoMunicipio: string;
      regimeTributario: number;
      nomeFantasia?: string;
      email?: string;
      telefone?: string;
      logradouro?: string;
      numero?: string;
      bairro?: string;
      municipio?: string;
      uf?: string;
      cep?: string;
    },
  ): Promise<void> {
    const auth = Buffer.from(`${token}:`).toString('base64');

    const httpGet = (path: string): Promise<number> =>
      new Promise((resolve, reject) => {
        const req = https.request(
          { hostname, path, method: 'GET', headers: { Authorization: `Basic ${auth}` }, timeout: 15000 },
          (res) => { res.resume(); res.on('end', () => resolve(res.statusCode ?? 0)); },
        );
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
      });

    const httpPost = (path: string, method: string, body: object): Promise<number> =>
      new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify(body);
        const req = https.request(
          {
            hostname, path, method,
            headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
            timeout: 15000,
          },
          (res) => { res.resume(); res.on('end', () => resolve(res.statusCode ?? 0)); },
        );
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(bodyStr);
        req.end();
      });

    const empresaBody: Record<string, unknown> = {
      nome: data.razaoSocial,
      inscricao_municipal: data.inscricaoMunicipal,
      codigo_municipio: data.codigoMunicipio,
      regime_tributario: data.regimeTributario,
      ...(data.nomeFantasia ? { nome_fantasia: data.nomeFantasia } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.telefone ? { telefone: data.telefone } : {}),
      ...(data.logradouro ? { logradouro: data.logradouro } : {}),
      ...(data.numero ? { numero: data.numero } : {}),
      ...(data.bairro ? { bairro: data.bairro } : {}),
      ...(data.municipio ? { municipio: data.municipio } : {}),
      ...(data.uf ? { uf: data.uf } : {}),
      ...(data.cep ? { cep: data.cep.replace(/\D/g, '') } : {}),
    };

    const getStatus = await httpGet(`/v2/empresas/${cnpj}`);
    if (getStatus === 200) {
      await httpPost(`/v2/empresas/${cnpj}`, 'PUT', empresaBody);
      this.logger.log(`Empresa ${cnpj} atualizada no Focus NFe`);
    } else if (getStatus === 404) {
      await httpPost(`/v2/empresas`, 'POST', { cnpj, ...empresaBody });
      this.logger.log(`Empresa ${cnpj} cadastrada no Focus NFe`);
    }
  }

  private focusNfeUploadCertificate(
    hostname: string,
    cnpj: string,
    token: string,
    fileBuffer: Buffer,
    senha: string,
  ): Promise<{ statusCode: number; body: any }> {
    return new Promise((resolve, reject) => {
      const boundary = '----FlexCatalogBoundary' + Math.random().toString(36).substring(2);
      const auth = Buffer.from(`${token}:`).toString('base64');

      const parts: Buffer[] = [];
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="senha"\r\n\r\n${senha}\r\n`,
        ),
      );
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="arquivo"; filename="certificado.pfx"\r\nContent-Type: application/octet-stream\r\n\r\n`,
        ),
      );
      parts.push(fileBuffer);
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
      const body = Buffer.concat(parts);

      const req = https.request(
        {
          hostname,
          path: `/v2/empresas/${cnpj}/certificado`,
          method: 'PUT',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
          },
          timeout: 30000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Focus NFe erro ${res.statusCode}: ${data}`));
            } else {
              try {
                resolve({ statusCode: res.statusCode ?? 0, body: JSON.parse(data) });
              } catch {
                resolve({ statusCode: res.statusCode ?? 0, body: data });
              }
            }
          });
        },
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('timeout'));
      });
      req.write(body);
      req.end();
    });
  }

  async getOrCreateSystemTenant() {
    const SYSTEM_TENANT_NAME = '__SYSTEM_AFFILIATES__';
    let tenant = await this.prisma.tenant.findFirst({
      where: { name: SYSTEM_TENANT_NAME },
    });
    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          name: SYSTEM_TENANT_NAME,
          country: 'US',
          locale: 'en',
          features: [],
          status: 'ACTIVE',
        },
      });
    }
    return tenant;
  }
}
