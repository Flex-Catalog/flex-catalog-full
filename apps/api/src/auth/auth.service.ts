import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import { BillingService } from '../billing/billing.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { DEFAULT_FEATURES, TokenPayload, AuthResponse } from '@product-catalog/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
    private readonly billingService: BillingService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if email exists
    const existingUser = await this.usersService.findByEmailGlobal(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Create tenant with PENDING_PAYMENT status
    const tenant = await this.tenantsService.create({
      name: dto.companyName,
      country: dto.country as any,
      locale: dto.locale as any,
      features: DEFAULT_FEATURES,
      status: 'PENDING_PAYMENT',
    });

    // Create admin user
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.create({
      tenantId: tenant.id,
      email: dto.email,
      name: dto.name,
      passwordHash,
      roles: ['TENANT_ADMIN'],
    });

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

    // Create Stripe checkout session
    const checkoutUrl = await this.billingService.createCheckoutSession(
      tenant.id,
      dto.email,
    );

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

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailGlobal(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
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

    let checkoutUrl: string | undefined;
    if (tenant.status === 'PENDING_PAYMENT') {
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

  private async generateTokens(payload: TokenPayload): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = uuidv4();

    return { accessToken, refreshToken };
  }
}
