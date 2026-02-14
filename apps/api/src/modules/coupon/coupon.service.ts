import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from '../../billing/billing.service';

export interface CreateCouponInput {
  code: string;
  discountPercent: number;
  durationMonths: number;
  maxUses?: number;
  expiresAt?: Date;
}

@Injectable()
export class CouponService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  async create(input: CreateCouponInput, createdById?: string) {
    const normalizedCode = input.code.toUpperCase().trim();

    const existing = await this.prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    if (input.discountPercent < 1 || input.discountPercent > 100) {
      throw new BadRequestException('Discount must be between 1 and 100');
    }
    if (input.durationMonths < 1 || input.durationMonths > 24) {
      throw new BadRequestException('Duration must be between 1 and 24 months');
    }

    // Pre-create on Stripe
    await this.billingService.createStripeCoupon(
      normalizedCode,
      input.discountPercent,
      input.durationMonths,
    );

    return this.prisma.coupon.create({
      data: {
        code: normalizedCode,
        discountPercent: input.discountPercent,
        durationMonths: input.durationMonths,
        maxUses: input.maxUses ?? null,
        expiresAt: input.expiresAt ?? null,
        createdById: createdById ?? null,
      },
    });
  }

  async validate(code: string) {
    const normalizedCode = code.toUpperCase().trim();

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon || !coupon.isActive) {
      throw new NotFoundException('Invalid or expired coupon');
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new NotFoundException('Invalid or expired coupon');
    }
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      throw new NotFoundException('Coupon usage limit reached');
    }

    return {
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      durationMonths: coupon.durationMonths,
    };
  }

  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async deactivate(id: string) {
    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
