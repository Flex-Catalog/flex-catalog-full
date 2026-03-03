import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Stripe from 'stripe';

const MAX_AFFILIATES_PER_TENANT = 2;
const COMMISSION_PERCENT_PER_AFFILIATE = 5; // 5% per affiliate, max 2 = max 10% total

export interface LinkAffiliateInput {
  tenantId: string;
  identifier: string; // email or CPF
  type?: 'STANDARD'; // Only STANDARD type supported
}

export interface PayoutInfo {
  method: 'pix' | 'bank' | 'stripe';
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'evp';
  pixKey?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  bankAccountType?: 'corrente' | 'poupanca';
  stripeConnectAccountId?: string;
}

@Injectable()
export class AffiliateService {
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || '',
      { apiVersion: '2024-12-18.acacia' as any },
    );
  }

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

    // If the email belongs to an existing user account (a company user), auto-activate
    // so they can see their affiliate commissions dashboard without a separate invite flow.
    if (isEmail && !affiliate.userId) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: normalizedIdentifier },
      });
      if (existingUser) {
        await this.prisma.affiliate.update({
          where: { id: affiliate.id },
          data: { userId: existingUser.id, status: 'ACTIVE', inviteToken: null },
        });
        affiliate = { ...affiliate, userId: existingUser.id, status: 'ACTIVE' };
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

      // Each affiliate earns a flat 5% commission independently (max 2 affiliates = 10% total)
      const actualPercent = COMMISSION_PERCENT_PER_AFFILIATE;
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

    // Fetch tenant names for the commissions
    const tenantIds = [...new Set(commissions.map((c: any) => c.tenantId))];
    const tenants = tenantIds.length
      ? await this.prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true },
        })
      : [];
    const tenantMap = new Map(tenants.map((t: any) => [t.id, t]));

    return {
      data: commissions.map((c: any) => ({
        ...c,
        amountCents: c.commissionCents,
        tenant: tenantMap.get(c.tenantId) || { id: c.tenantId, name: '-' },
      })),
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
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { email: email.toLowerCase() },
      include: { tenantLinks: true },
    });

    if (!affiliate) return null;

    // Fetch tenant names for each linked company
    const tenantIds = affiliate.tenantLinks.map((l: any) => l.tenantId);
    const tenants = tenantIds.length
      ? await this.prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true },
        })
      : [];
    const tenantMap = new Map(tenants.map((t: any) => [t.id, t]));

    return {
      id: affiliate.id,
      email: affiliate.email,
      name: affiliate.name,
      cpf: affiliate.cpf,
      status: affiliate.status,
      tenantAffiliates: affiliate.tenantLinks.map((link: any) => ({
        id: link.id,
        type: 'STANDARD',
        commissionPercent: COMMISSION_PERCENT_PER_AFFILIATE,
        tenant: tenantMap.get(link.tenantId) || { id: link.tenantId, name: '-' },
      })),
    };
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

  /**
   * Affiliate updates their payout info (Pix, bank account or Stripe Connect).
   */
  async updatePayoutInfo(email: string, payoutInfo: PayoutInfo) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!affiliate) throw new NotFoundException('Affiliate not found');

    await (this.prisma.affiliate as any).update({
      where: { id: affiliate.id },
      data: { payoutInfo },
    });

    return { success: true };
  }

  /**
   * Get affiliate's current payout info.
   */
  async getPayoutInfo(email: string) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!affiliate) throw new NotFoundException('Affiliate not found');
    return (affiliate as any).payoutInfo ?? null;
  }

  /**
   * Admin: list all pending commissions across all affiliates.
   */
  async getAllPendingCommissions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [commissions, total] = await Promise.all([
      this.prisma.affiliateCommission.findMany({
        where: { status: 'PENDING' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { affiliate: true },
      }),
      this.prisma.affiliateCommission.count({ where: { status: 'PENDING' } }),
    ]);

    const tenantIds = [...new Set(commissions.map((c: any) => c.tenantId))];
    const tenants = tenantIds.length
      ? await this.prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true },
        })
      : [];
    const tenantMap = new Map(tenants.map((t: any) => [t.id, t]));

    return {
      data: commissions.map((c: any) => ({
        id: c.id,
        affiliateId: c.affiliateId,
        affiliateName: c.affiliate.name || c.affiliate.email,
        affiliateEmail: c.affiliate.email,
        payoutInfo: (c.affiliate as any).payoutInfo ?? null,
        tenant: tenantMap.get(c.tenantId) || { id: c.tenantId, name: '-' },
        amountCents: c.commissionCents,
        commissionPercent: c.commissionPercent,
        status: c.status,
        periodStart: c.periodStart,
        periodEnd: c.periodEnd,
        createdAt: c.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: pay a commission — Stripe Transfer if affiliate has Stripe Connect account,
   * otherwise marks as manually paid.
   */
  async payCommission(commissionId: string): Promise<{ method: 'stripe' | 'manual'; transferId?: string }> {
    const commission = await this.prisma.affiliateCommission.findUnique({
      where: { id: commissionId },
      include: { affiliate: true },
    });

    if (!commission) throw new NotFoundException('Commission not found');
    if (commission.status === 'PAID') throw new BadRequestException('Commission is already paid');

    const payoutInfo = (commission.affiliate as any).payoutInfo as PayoutInfo | null;
    let method: 'stripe' | 'manual' = 'manual';
    let transferId: string | undefined;

    if (payoutInfo?.stripeConnectAccountId && commission.commissionCents > 0) {
      try {
        const transfer = await this.stripe.transfers.create({
          amount: commission.commissionCents,
          currency: 'brl',
          destination: payoutInfo.stripeConnectAccountId,
          description: `Commission #${commissionId}`,
          metadata: { commissionId, affiliateId: commission.affiliateId },
        });
        transferId = transfer.id;
        method = 'stripe';
      } catch {
        // If Stripe transfer fails, fall back to manual marking
        method = 'manual';
      }
    }

    await this.prisma.affiliateCommission.update({
      where: { id: commissionId },
      data: { status: 'PAID' },
    });

    return { method, transferId };
  }
}
