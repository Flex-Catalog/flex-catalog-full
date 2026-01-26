import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantStatus, Feature, CountryCode, SupportedLocale } from '@product-catalog/shared';

interface CreateTenantInput {
  name: string;
  country: CountryCode;
  locale?: SupportedLocale;
  features?: Feature[];
  status?: TenantStatus;
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
      },
    });
  }

  async findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
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
}
