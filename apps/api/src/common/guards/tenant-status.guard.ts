import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser, ACTIVE_STATUSES } from '@product-catalog/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export const SKIP_TENANT_CHECK_KEY = 'skipTenantCheck';

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const skipTenantCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTenantCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user) {
      return true; // Let JwtAuthGuard handle this
    }

    if (!ACTIVE_STATUSES.includes(user.tenantStatus as any)) {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Active subscription required. Please complete payment.',
        tenantStatus: user.tenantStatus,
      });
    }

    return true;
  }
}
