import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Feature, AuthUser } from '@product-catalog/shared';
import { FEATURES_KEY } from '../decorators/features.decorator';

@Injectable()
export class FeaturesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeatures = this.reflector.getAllAndOverride<Feature[]>(
      FEATURES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasFeatures = requiredFeatures.every((feature) =>
      user.tenantFeatures.includes(feature),
    );

    if (!hasFeatures) {
      throw new ForbiddenException('Feature not available for your plan');
    }

    return true;
  }
}
