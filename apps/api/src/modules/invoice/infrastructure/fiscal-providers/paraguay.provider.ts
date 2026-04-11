import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import { ConfigService } from '@nestjs/config';
import { Result, ValidationError } from '../../../../@core/domain/result';
import { IFiscalProvider, FiscalProviderResult } from '../../domain/services/fiscal-provider.interface';
import { PrismaService } from '../../../../prisma/prisma.service';

/**
 * Paraguay SIFEN Provider
 *
 * Paraguay uses SIFEN (Sistema Integrado de Facturación Electrónica Nacional)
 * managed by the SET (Subsecretaría de Estado de Tributación).
 *
 * Integration: SET REST API — FREE for all Paraguayan taxpayers.
 * Test env: https://sifen-test.set.gov.py/de/services/
 * Prod env: https://sifen.set.gov.py/de/services/
 *
 * Requires registration at: https://www.set.gov.py/
 * After registration you receive a RUC (Registro Único del Contribuyente)
 * and can generate DE (Documento Electrónico) via SIFEN.
 *
 * IVA rates in Paraguay:
 *   - Standard:   10%  (most goods and services)
 *   - Special:     5%  (basic food, medicines, agricultural products)
 *   - Exento:      0%  (exempt)
 *
 * Languages spoken in Paraguay: Spanish (es) + Guaraní (gn)
 * For business invoicing, Spanish is the standard language.
 *
 * Env vars (required for real SIFEN):
 *   PARAGUAY_SIFEN_RUC         — Emitter RUC number
 *   PARAGUAY_SIFEN_TOKEN       — JWT access token from SET
 *   PARAGUAY_SIFEN_AMBIENTE    — "test" | "producao" (default: "test")
 */
@Injectable()
export class ParaguayFiscalProvider implements IFiscalProvider {
  private readonly logger = new Logger(ParaguayFiscalProvider.name);
  private readonly supportedCountryCodes = ['PY', 'PRY', 'PARAGUAY'] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  supportedCountries(): readonly string[] {
    return this.supportedCountryCodes;
  }

  supportsCountry(country: string): boolean {
    const normalized = country.toUpperCase().trim();
    return (this.supportedCountryCodes as readonly string[]).includes(normalized);
  }

  validate(payload: Record<string, unknown>): Result<void, Error> {
    const errors: string[] = [];

    if (!payload.customer) {
      errors.push('customer is required');
    } else {
      const customer = payload.customer as Record<string, unknown>;
      if (!customer.ruc && !customer.taxId && !customer.ci) {
        errors.push('customer.ruc (RUC) or customer.ci (Cédula de Identidad) is required');
      }
      if (!customer.name) {
        errors.push('customer.name is required');
      }
    }

    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      errors.push('At least one item is required');
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError(errors.join(', ')));
    }

    return Result.void();
  }

  async issue(
    payload: Record<string, unknown>,
    tenantId: string,
  ): Promise<Result<FiscalProviderResult, Error>> {
    const validation = this.validate(payload);
    if (validation.isFailure) {
      return Result.ok({ success: false, error: validation.error.message });
    }

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { taxId: true, name: true, fiscalConfig: true },
      });

      const fiscal = (tenant?.fiscalConfig ?? {}) as Record<string, string>;
      const customer = payload.customer as Record<string, unknown>;
      const items = payload.items as Array<Record<string, unknown>>;

      const sifenToken = this.configService.get<string>('PARAGUAY_SIFEN_TOKEN');
      const emitterRuc =
        this.configService.get<string>('PARAGUAY_SIFEN_RUC') ??
        fiscal['ruc'] ??
        tenant?.taxId ??
        '';
      const ambiente = this.configService.get<string>('PARAGUAY_SIFEN_AMBIENTE') ?? 'test';

      const dePayload = this.buildSifenPayload({
        emitterRuc,
        emitterName: fiscal['razaoSocial'] ?? tenant?.name ?? '',
        emitterAddress: fiscal['logradouro'] ?? '',
        customer,
        items,
        ambiente,
      });

      if (sifenToken && emitterRuc) {
        this.logger.log(`Emitindo DE via SIFEN para tenant ${tenantId}`);
        const hostname =
          ambiente === 'producao'
            ? 'sifen.set.gov.py'
            : 'sifen-test.set.gov.py';

        const result = await this.callSifenAPI(hostname, dePayload, sifenToken);
        return Result.ok(result);
      }

      // Fallback: local mock with DE structure
      this.logger.warn(`SIFEN em modo local (PARAGUAY_SIFEN_TOKEN não configurado).`);
      return Result.ok(this.generateLocalMock(dePayload, items));
    } catch (error) {
      return Result.ok({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private buildSifenPayload(data: {
    emitterRuc: string;
    emitterName: string;
    emitterAddress: string;
    customer: Record<string, unknown>;
    items: Array<Record<string, unknown>>;
    ambiente: string;
  }): Record<string, unknown> {
    const now = new Date();
    const ivaRate = 10; // IVA general 10%
    const totalBase = data.items.reduce((sum, item) => {
      const unitCents = Number(item.valorUnitarioCents ?? item.unitPriceCents ?? 0);
      const qty = Number(item.quantidade ?? item.quantity ?? 1);
      return sum + (unitCents / 100) * qty;
    }, 0);
    const totalIva = parseFloat((totalBase * (ivaRate / 100)).toFixed(2));
    const totalAmount = parseFloat((totalBase + totalIva).toFixed(2));

    return {
      // DE Header — Documento Electrónico SIFEN
      version: 150,
      ruc: data.emitterRuc,
      tipoDocumento: 1, // 1 = Factura Electrónica
      establecimiento: '001',
      punto: '001',
      numero: String(Math.floor(Math.random() * 9999999)).padStart(7, '0'),
      serie: 'AA',
      tipoEmision: 1, // 1 = Normal, 2 = Contingencia
      codigoSeguridadAleatorio: Math.floor(Math.random() * 999).toString().padStart(3, '0'),
      fechaFirmaDigital: now.toISOString(),
      tipoTransaccion: 1, // 1 = Venta de mercaderías
      tipoImpuesto: 1, // 1 = IVA
      moneda: 'PYG',
      condicionAnticipo: null,
      condicionTipoCambio: 1,
      descuentoGlobal: 0,
      anticipoGlobal: 0,

      // Emisor
      emisor: {
        ruc: data.emitterRuc,
        razonSocial: data.emitterName,
        nombreFantasia: data.emitterName,
        actividadEconomica: 'Comercio',
        codigoActividadEconomica: '4690',
        timbradoNumero: '12345678',
        timbradoFecha: `${now.getFullYear()}-01-01`,
        tipoContribuyente: 1,
        establecimientos: [
          {
            codigo: '001',
            direccion: data.emitterAddress || 'Asunción',
            numeroCasa: '0',
            complementoDireccion1: '',
            complementoDireccion2: '',
            departamento: 11, // Central
            municipio: 1, // Asunción
            telefono: '',
            email: '',
          },
        ],
      },

      // Receptor (cliente)
      receptor: {
        documentoTipo: data.customer.ruc ? 11 : 5, // 11=RUC, 5=Cédula
        documentoNumero: String(data.customer.ruc ?? data.customer.ci ?? data.customer.taxId ?? ''),
        nombre: String(data.customer.name),
        direccion: String(data.customer.address ?? 'Paraguay'),
        numeroCasa: '0',
        departamento: 11,
        municipio: 1,
        telefono: String(data.customer.phone ?? ''),
        email: String(data.customer.email ?? ''),
        tipoContribuyente: data.customer.ruc ? 1 : 4,
      },

      // Itens
      items: data.items.map((item, idx) => {
        const unitCents = Number(item.valorUnitarioCents ?? item.unitPriceCents ?? 0);
        const qty = Number(item.quantidade ?? item.quantity ?? 1);
        const unitPrice = unitCents / 100;
        const lineTotal = parseFloat((unitPrice * qty).toFixed(2));
        const lineIva = parseFloat((lineTotal * ivaRate / 100).toFixed(2));
        return {
          codigo: String(item.codigoProduto ?? item.code ?? `ITEM${idx + 1}`),
          descripcion: String(item.descricao ?? item.description ?? 'Item'),
          unidadMedida: 77, // Unidad
          cantidad: qty,
          precioUnitario: unitPrice,
          cambio: 0,
          descuento: 0,
          anticipo: 0,
          pais: 'PY',
          toleranciaEntrega: 0,
          cdcAnticipo: null,
          dncp: null,
          ivaTipo: 1, // Gravado IVA
          ivaBase: 100,
          iva: ivaRate,
          lote: null,
          vencimiento: null,
          numeroSerie: null,
          numeroPedido: null,
          numeroSeguimiento: null,
          importItem: lineTotal,
          ivaItem: lineIva,
        };
      }),

      // Totales
      subtotal: totalBase,
      totalIva5: 0,
      totalIva10: totalIva,
      totalIvaExento: 0,
      totalIva: totalIva,
      total: totalAmount,

      // Condición de pago
      condicionPago: {
        tipo: 1, // 1 = Contado
        entregas: [
          {
            tipo: 1, // 1 = Efectivo
            monto: String(totalAmount),
            moneda: 'PYG',
            cambio: 0,
          },
        ],
      },
    };
  }

  private async callSifenAPI(
    hostname: string,
    dePayload: Record<string, unknown>,
    token: string,
  ): Promise<FiscalProviderResult> {
    return new Promise((resolve) => {
      const bodyStr = JSON.stringify(dePayload);
      const options: https.RequestOptions = {
        hostname,
        path: '/de/services/recibe-lote-sync',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
        timeout: 30000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const body = JSON.parse(data);
            if (res.statusCode === 200 && body.dVolDe?.gResProcLote?.gProcResultado?.[0]?.dEstRes === 'Aprobado') {
              resolve({
                success: true,
                data: Object.freeze({
                  cdc: body.dVolDe?.gResProcLote?.gProcResultado?.[0]?.dCDCRef,
                  numeroDE: `${dePayload.establecimiento}-${dePayload.punto}-${dePayload.numero}`,
                  issuedAt: new Date().toISOString(),
                  status: 'APROBADO',
                  ambiente: hostname.includes('test') ? 'test' : 'producao',
                }),
              });
            } else {
              const error =
                body.dVolDe?.gResProcLote?.gProcResultado?.[0]?.gRespDE?.gDetError?.[0]?.dMsgError ??
                body.msMsgDe ??
                `HTTP ${res.statusCode}`;
              resolve({ success: false, error: `SIFEN: ${error}` });
            }
          } catch {
            resolve({ success: false, error: `SIFEN: resposta inválida (${res.statusCode})` });
          }
        });
      });

      req.on('error', (err) => resolve({ success: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Timeout ao conectar com SIFEN' });
      });

      req.write(bodyStr);
      req.end();
    });
  }

  private generateLocalMock(
    dePayload: Record<string, unknown>,
    items: Array<Record<string, unknown>>,
  ): FiscalProviderResult {
    const cdc = `${Date.now()}${Math.random().toString(36).substring(2, 10).toUpperCase()}`.substring(0, 44);
    return {
      success: true,
      data: Object.freeze({
        cdc,
        numeroDE: `${dePayload.establecimiento}-${dePayload.punto}-${dePayload.numero}`,
        issuedAt: new Date().toISOString(),
        status: 'LOCAL_MOCK',
        ambiente: 'local',
        aviso:
          'DE gerado localmente (não enviado ao SIFEN/SET). Configure PARAGUAY_SIFEN_TOKEN e PARAGUAY_SIFEN_RUC em variáveis de ambiente para emissão real. Cadastro gratuito em: https://www.set.gov.py/',
      }),
    };
  }
}
