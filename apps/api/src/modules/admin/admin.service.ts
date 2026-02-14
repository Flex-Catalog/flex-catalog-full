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
}
