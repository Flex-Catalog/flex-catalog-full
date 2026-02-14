import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import * as crypto from 'crypto';

const MAX_AFFILIATES_PER_TENANT = 2;
const STANDARD_COMMISSION_PERCENT = 10;
const PARTNER_COMMISSION_PERCENT = 40;

export interface LinkAffiliateInput {
  tenantId: string;
  identifier: string; // email or CPF
  type?: 'STANDARD' | 'PARTNER';
}

@Injectable()
export class AffiliateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Link an affiliate to a tenant. If the affiliate doesn't exist, create a
   * PENDING record and send an invite email. Max 2 per tenant.
   */
  async linkAffiliate(input: LinkAffiliateInput) {
    const { tenantId, identifier, type = 'STANDARD' } = input;

    // Check current affiliate count for this tenant
    const currentCount = await this.prisma.tenantAffiliate.count({
      where: { tenantId },
    });
    if (currentCount >= MAX_AFFILIATES_PER_TENANT) {
      throw new BadRequestException(
        `Maximum of ${MAX_AFFILIATES_PER_TENANT} affiliates per company`,
      );
    }

    // Determine if identifier is email or CPF
    const isEmail = identifier.includes('@');
    const normalizedIdentifier = isEmail
      ? identifier.toLowerCase().trim()
      : identifier.replace(/[.\-\/\s]/g, '');

    // Find or create affiliate
    let affiliate = isEmail
      ? await this.prisma.affiliate.findUnique({ where: { email: normalizedIdentifier } })
      : await this.prisma.affiliate.findFirst({ where: { cpf: normalizedIdentifier } });

    if (affiliate) {
      // Check if already linked to this tenant
      const existingLink = await this.prisma.tenantAffiliate.findUnique({
        where: {
          tenantId_affiliateId: { tenantId, affiliateId: affiliate.id },
        },
      });
      if (existingLink) {
        throw new BadRequestException('This affiliate is already linked to your company');
      }
    } else {
      // Create a PENDING affiliate and send invite
      const inviteToken = crypto.randomBytes(32).toString('hex');

      affiliate = await this.prisma.affiliate.create({
        data: {
          email: isEmail ? normalizedIdentifier : `pending-${normalizedIdentifier}@affiliate.local`,
          cpf: !isEmail ? normalizedIdentifier : undefined,
          type,
          status: 'PENDING',
          inviteToken,
        },
      });

      // Send invite email if we have an email
      if (isEmail) {
        this.emailService
          .sendAffiliateInvite(normalizedIdentifier, inviteToken)
          .catch(() => {});
      }
    }

    // Create the link
    const link = await this.prisma.tenantAffiliate.create({
      data: { tenantId, affiliateId: affiliate.id },
    });

    return {
      id: link.id,
      affiliateId: affiliate.id,
      email: affiliate.email,
      cpf: affiliate.cpf,
      name: affiliate.name,
      type: affiliate.type,
      status: affiliate.status,
      isNew: affiliate.status === 'PENDING',
    };
  }

  /**
   * Get all affiliates linked to a tenant.
   */
  async getAffiliatesByTenant(tenantId: string) {
    const links = await this.prisma.tenantAffiliate.findMany({
      where: { tenantId },
      include: { affiliate: true },
      orderBy: { linkedAt: 'asc' },
    });

    return links.map((link: any) => ({
      id: link.id,
      affiliateId: link.affiliate.id,
      email: link.affiliate.email,
      cpf: link.affiliate.cpf,
      name: link.affiliate.name,
      type: link.affiliate.type,
      status: link.affiliate.status,
      linkedAt: link.linkedAt,
    }));
  }

  /**
   * Called when an affiliate user registers: activate and link userId.
   */
  async activateAffiliate(email: string, userId: string) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (affiliate && affiliate.status === 'PENDING') {
      await this.prisma.affiliate.update({
        where: { id: affiliate.id },
        data: {
          status: 'ACTIVE',
          userId,
          inviteToken: null,
        },
      });
    }
  }

  /**
   * Activate affiliate by invite token (used during invite signup).
   */
  async activateByInviteToken(token: string, userId: string, name: string) {
    const affiliate = await this.prisma.affiliate.findFirst({
      where: { inviteToken: token },
    });

    if (!affiliate) {
      throw new NotFoundException('Invalid invite token');
    }

    await this.prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        status: 'ACTIVE',
        userId,
        name,
        inviteToken: null,
      },
    });

    return affiliate;
  }

  /**
   * Calculate and record commissions when a tenant payment is confirmed.
   */
  async processPaymentCommissions(
    tenantId: string,
    paymentAmountCents: number,
    stripeInvoiceId?: string,
    periodStart?: Date,
    periodEnd?: Date,
  ) {
    // Get affiliates linked to this tenant
    const links = await this.prisma.tenantAffiliate.findMany({
      where: { tenantId },
      include: { affiliate: true },
    });

    if (links.length === 0) return [];

    const commissions = [];

    for (const link of links) {
      const aff = link.affiliate;

      // Determine base commission percentage based on type
      const basePercent =
        aff.type === 'PARTNER'
          ? PARTNER_COMMISSION_PERCENT
          : STANDARD_COMMISSION_PERCENT;

      // Count how many affiliates of the same type are linked
      const sameTypeCount = links.filter((l: any) => l.affiliate.type === aff.type).length;

      // Split evenly among affiliates of the same type
      const actualPercent = basePercent / sameTypeCount;
      const commissionCents = Math.round(
        (paymentAmountCents * actualPercent) / 100,
      );

      const commission = await this.prisma.affiliateCommission.create({
        data: {
          affiliateId: aff.id,
          tenantId,
          paymentAmountCents,
          commissionPercent: actualPercent,
          commissionCents,
          stripeInvoiceId,
          status: 'PENDING',
          periodStart,
          periodEnd,
        },
      });

      commissions.push(commission);
    }

    return commissions;
  }

  /**
   * Get commissions for an affiliate (dashboard).
   */
  async getCommissionsByAffiliate(affiliateId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [commissions, total, totalEarned] = await Promise.all([
      this.prisma.affiliateCommission.findMany({
        where: { affiliateId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.affiliateCommission.count({ where: { affiliateId } }),
      this.prisma.affiliateCommission.aggregate({
        where: { affiliateId },
        _sum: { commissionCents: true },
      }),
    ]);

    return {
      data: commissions,
      total,
      totalEarnedCents: totalEarned._sum.commissionCents || 0,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get commissions by user email (for logged-in affiliate viewing their dashboard).
   */
  async getCommissionsByUserEmail(email: string, page = 1, limit = 20) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!affiliate) {
      return { data: [], total: 0, totalEarnedCents: 0, page, limit, totalPages: 0 };
    }

    return this.getCommissionsByAffiliate(affiliate.id, page, limit);
  }

  /**
   * Get affiliate info by user email.
   */
  async getAffiliateByEmail(email: string) {
    return this.prisma.affiliate.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        tenantLinks: true,
        commissions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Admin: list all affiliates.
   */
  async getAllAffiliates(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [affiliates, total] = await Promise.all([
      this.prisma.affiliate.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { tenantLinks: true, commissions: true } },
        },
      }),
      this.prisma.affiliate.count(),
    ]);

    return {
      data: affiliates.map((a: any) => ({
        id: a.id,
        email: a.email,
        cpf: a.cpf,
        name: a.name,
        type: a.type,
        status: a.status,
        tenantCount: a._count.tenantLinks,
        commissionCount: a._count.commissions,
        createdAt: a.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
