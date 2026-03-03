import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TokenPayload, AuthUser, ROLE_PERMISSIONS, Role, Permission, Feature } from '@product-catalog/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: TokenPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Auto-expire trial: if tenant is TRIAL and trialEndsAt has passed, mark as PAST_DUE
    let tenantStatus = user.tenant.status;
    if (
      tenantStatus === 'TRIAL' &&
      user.tenant.trialEndsAt &&
      new Date(user.tenant.trialEndsAt) < new Date()
    ) {
      await this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { status: 'PAST_DUE' },
      });
      tenantStatus = 'PAST_DUE';
    }

    const permissions = this.getPermissionsFromRoles(user.roles as Role[]);

    // Check if this user is also registered as an active affiliate (dual-role: company + affiliate)
    const affiliateRecord = await this.prisma.affiliate.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      select: { id: true },
    });

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      roles: user.roles as Role[],
      permissions,
      tenantStatus: tenantStatus as any,
      tenantFeatures: user.tenant.features as Feature[],
      isAffiliate: !!affiliateRecord,
    };
  }

  private getPermissionsFromRoles(roles: Role[]): Permission[] {
    const permissions = new Set<Permission>();
    for (const role of roles) {
      const rolePerms = ROLE_PERMISSIONS[role] || [];
      rolePerms.forEach((p: Permission) => permissions.add(p));
    }
    return Array.from(permissions);
  }
}
