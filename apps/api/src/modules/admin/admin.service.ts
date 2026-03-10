import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      canceledTenants,
      totalUsers,
      totalCoupons,
      activeCoupons,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.tenant.count({ where: { status: 'TRIAL' } }),
      this.prisma.tenant.count({ where: { status: 'CANCELED' } }),
      this.prisma.user.count(),
      this.prisma.coupon.count(),
      this.prisma.coupon.count({ where: { isActive: true } }),
    ]);

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        trial: trialTenants,
        canceled: canceledTenants,
      },
      users: { total: totalUsers },
      coupons: { total: totalCoupons, active: activeCoupons },
    };
  }

  async getAllTenants(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true } },
        },
      }),
      this.prisma.tenant.count(),
    ]);

    return {
      data: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        country: t.country,
        status: t.status,
        taxId: t.taxId,
        stripeCustomerId: t.stripeCustomerId,
        trialEndsAt: t.trialEndsAt,
        currentPeriodEnd: t.currentPeriodEnd,
        userCount: t._count.users,
        createdAt: t.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRecentPayments(limit = 10) {
    // Return tenants with active subscriptions ordered by latest payment
    const tenants = await this.prisma.tenant.findMany({
      where: {
        stripeSubscriptionId: { not: null },
      },
      orderBy: { currentPeriodEnd: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        status: true,
        currentPeriodEnd: true,
        stripeSubscriptionId: true,
      },
    });

    return tenants;
  }

  /**
   * Admin: get all affiliates with aggregated stats (companies referred, commissions).
   */
  async getAffiliateStats(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [affiliates, total] = await Promise.all([
      this.prisma.affiliate.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenantLinks: true,
          commissions: true,
        },
      }),
      this.prisma.affiliate.count(),
    ]);

    return {
      data: affiliates.map((a: any) => {
        const totalEarned = a.commissions.reduce(
          (sum: number, c: any) => sum + c.commissionCents,
          0,
        );
        const pendingCents = a.commissions
          .filter((c: any) => c.status === 'PENDING')
          .reduce((sum: number, c: any) => sum + c.commissionCents, 0);
        const paidCents = a.commissions
          .filter((c: any) => c.status === 'PAID')
          .reduce((sum: number, c: any) => sum + c.commissionCents, 0);

        return {
          id: a.id,
          email: a.email,
          name: a.name,
          status: a.status,
          type: a.type,
          activeCompanies: a.tenantLinks.length,
          totalEarnedCents: totalEarned,
          pendingCents,
          paidCents,
          payoutInfo: (a as any).payoutInfo ?? null,
          createdAt: a.createdAt,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: monthly revenue from active subscriptions (last 12 months).
   * Groups tenants by the month of their currentPeriodEnd.
   */
  async getMonthlyRevenue() {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const tenants = await this.prisma.tenant.findMany({
      where: {
        stripeSubscriptionId: { not: null },
        currentPeriodEnd: { gte: twelveMonthsAgo },
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      select: { currentPeriodEnd: true, stripeSubscriptionId: true },
    });

    // Group by YYYY-MM
    const byMonth: Record<string, number> = {};
    for (const t of tenants) {
      if (!t.currentPeriodEnd) continue;
      const key = t.currentPeriodEnd.toISOString().slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + 1;
    }

    // Build sorted array for the last 12 months
    const result: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      result.push({ month: key, count: byMonth[key] || 0 });
    }

    return result;
  }
}
