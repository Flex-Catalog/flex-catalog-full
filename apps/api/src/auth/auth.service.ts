import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import { BillingService } from '../billing/billing.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { AffiliateService } from '../modules/affiliate/affiliate.service';
import { DEFAULT_FEATURES, TokenPayload, AuthResponse } from '@product-catalog/shared';
import * as crypto from 'crypto';

const TRIAL_DAYS = 30; // 1 month
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
    private readonly billingService: BillingService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly affiliateService: AffiliateService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if email exists
    const existingUser = await this.usersService.findByEmailGlobal(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // ========== AFFILIATE REGISTRATION ==========
    if (dto.accountType === 'affiliate') {
      return this.registerAffiliate(dto);
    }

    // ========== COMPANY REGISTRATION (default) ==========
    if (!dto.companyName) {
      throw new BadRequestException('Company name is required');
    }

    // Check Tax ID uniqueness
    if (dto.taxId) {
      const normalizedTaxId = dto.taxId.replace(/[.\-\/\s]/g, '');
      const existingTenant = await this.tenantsService.findByTaxId(normalizedTaxId);
      if (existingTenant) {
        throw new ConflictException('Tax ID already registered');
      }
    }

    // Validate coupon if provided
    let coupon: { id: string; code: string; discountPercent: number; durationMonths: number } | null = null;
    if (dto.couponCode) {
      const found = await this.prisma.coupon.findUnique({
        where: { code: dto.couponCode.toUpperCase() },
      });

      if (!found || !found.isActive) {
        throw new BadRequestException('Invalid or expired coupon');
      }
      if (found.expiresAt && found.expiresAt < new Date()) {
        throw new BadRequestException('Invalid or expired coupon');
      }
      if (found.maxUses && found.currentUses >= found.maxUses) {
        throw new BadRequestException('Coupon usage limit reached');
      }

      coupon = {
        id: found.id,
        code: found.code,
        discountPercent: found.discountPercent,
        durationMonths: found.durationMonths,
      };
    }

    // Calculate trial end date
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    // Create tenant with TRIAL status (free for 1 month)
    const tenant = await this.tenantsService.create({
      name: dto.companyName,
      country: dto.country as any,
      locale: dto.locale as any,
      features: DEFAULT_FEATURES,
      status: 'TRIAL',
      taxId: dto.taxId ? dto.taxId.replace(/[.\-\/\s]/g, '') : undefined,
      trialEndsAt,
    });

    // Create admin user with verification token
    const passwordHash = await argon2.hash(dto.password);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);

    const user = await this.usersService.create({
      tenantId: tenant.id,
      email: dto.email,
      name: dto.name,
      passwordHash,
      roles: ['TENANT_ADMIN'],
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Send verification email (non-blocking)
    this.emailService
      .sendVerificationEmail(dto.email, verificationToken, dto.locale)
      .catch(() => {}); // Don't block registration on email failure

    // Link affiliates if provided (max 2, non-blocking)
    if (dto.affiliates && dto.affiliates.length > 0) {
      for (const aff of dto.affiliates.slice(0, 2)) {
        try {
          await this.affiliateService.linkAffiliate({
            tenantId: tenant.id,
            identifier: aff.identifier,
            type: aff.type === 'STANDARD' ? 'STANDARD' : undefined,
          });
        } catch {
          // Don't block registration if affiliate linking fails
        }
      }
    }

    // If registering via affiliate invite token, activate the affiliate
    if (dto.inviteToken) {
      try {
        await this.affiliateService.activateByInviteToken(
          dto.inviteToken,
          user.id,
          dto.name,
        );
      } catch {
        // Don't block registration if activation fails
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      tenantId: tenant.id,
      email: user.email,
      roles: user.roles as any[],
    });

    // Save refresh token hash
    const refreshTokenHash = await argon2.hash(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user.id, refreshTokenHash);

    // Build Stripe checkout — entirely non-blocking: any Stripe error keeps registration alive
    let checkoutUrl: string | null = null;
    try {
      let stripeCouponId: string | undefined;
      if (coupon) {
        stripeCouponId = await this.billingService.createStripeCoupon(
          coupon.code,
          coupon.discountPercent,
          coupon.durationMonths,
        );
        await this.prisma.coupon.update({
          where: { id: coupon.id },
          data: { currentUses: { increment: 1 } },
        });
      } else {
        stripeCouponId = await this.billingService.getOrCreateIntroductoryCoupon();
      }
      checkoutUrl = await this.billingService.createCheckoutSession(
        tenant.id,
        dto.email,
        { trialDays: TRIAL_DAYS, stripeCouponId, locale: dto.locale || 'en' },
      );
    } catch (err: any) {
      console.error('[Auth] Stripe setup failed, registration continues:', err?.message);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles as any[],
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status as any,
      },
      tokens,
      checkoutUrl: checkoutUrl ?? undefined,
    };
  }

  private async registerAffiliate(dto: RegisterDto): Promise<AuthResponse> {
    // Get or create system tenant for affiliate users
    const systemTenant = await this.tenantsService.getOrCreateSystemTenant();

    // Create user with AFFILIATE role
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.create({
      tenantId: systemTenant.id,
      email: dto.email,
      name: dto.name,
      passwordHash,
      roles: ['AFFILIATE'],
    });

    // Create or activate Affiliate record
    const normalizedCpf = dto.cpf ? dto.cpf.replace(/[.\-\/\s]/g, '') : undefined;
    const existingAffiliate = await this.prisma.affiliate.findUnique({
      where: { email: dto.email },
    });

    if (existingAffiliate) {
      // Affiliate was invited by a company - activate it
      await this.prisma.affiliate.update({
        where: { id: existingAffiliate.id },
        data: {
          status: 'ACTIVE',
          userId: user.id,
          name: dto.name,
          cpf: normalizedCpf || existingAffiliate.cpf,
        },
      });
    } else {
      // New affiliate registration
      await this.prisma.affiliate.create({
        data: {
          email: dto.email,
          name: dto.name,
          cpf: normalizedCpf,
          status: 'ACTIVE',
          userId: user.id,
          type: 'STANDARD',
        },
      });
    }

    // Generate tokens (no checkout URL for affiliates)
    const tokens = await this.generateTokens({
      sub: user.id,
      tenantId: systemTenant.id,
      email: user.email,
      roles: user.roles as any[],
    });

    const refreshTokenHash = await argon2.hash(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user.id, refreshTokenHash);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles as any[],
      },
      tenant: {
        id: systemTenant.id,
        name: systemTenant.name,
        status: systemTenant.status as any,
      },
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Fetch all users with this email across all tenants (same email can exist in multiple tenants)
    const candidates = await this.usersService.findAllByEmailGlobal(dto.email);
    if (!candidates.length) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Find the first active user whose password matches
    let user: (typeof candidates)[0] | null = null;
    for (const candidate of candidates) {
      if (!candidate.isActive) continue;
      const valid = await argon2.verify(candidate.passwordHash, dto.password);
      if (valid) { user = candidate; break; }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tenant = await this.tenantsService.findById(user.tenantId);
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      tenantId: tenant.id,
      email: user.email,
      roles: user.roles as any[],
    });

    const refreshTokenHash = await argon2.hash(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user.id, refreshTokenHash);

    // Skip checkout for affiliate users
    const isAffiliate = (user.roles as string[]).includes('AFFILIATE');
    let checkoutUrl: string | undefined;
    if (!isAffiliate && tenant.status === 'PENDING_PAYMENT') {
      checkoutUrl = await this.billingService.createCheckoutSession(
        tenant.id,
        user.email,
      );
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles as any[],
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status as any,
      },
      tokens,
      checkoutUrl,
    };
  }

  async refresh(refreshToken: string, userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isTokenValid = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: user.roles as any[],
    });

    const newRefreshTokenHash = await argon2.hash(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user.id, newRefreshTokenHash);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async verifyEmail(token: string): Promise<{ verified: boolean }> {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return { verified: true };
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.emailVerified) {
      return; // Already verified
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    await this.emailService.sendVerificationEmail(user.email, verificationToken);
  }

  async forgotPassword(email: string): Promise<void> {
    // Always return success to avoid user enumeration
    const user = await this.usersService.findByEmailGlobal(email);
    if (!user) return;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      } as any,
    });

    await this.emailService.sendPasswordResetEmail(email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: token } as any,
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const expires = (user as any).passwordResetExpires as Date | null;
    if (!expires || expires < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        refreshTokenHash: null, // invalidate all sessions
      } as any,
    });
  }

  private async generateTokens(payload: TokenPayload): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();
    return { accessToken, refreshToken };
  }
}
