import { Injectable } from '@nestjs/common';
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
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { fiscalConfig: config as any },
      select: { fiscalConfig: true },
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
