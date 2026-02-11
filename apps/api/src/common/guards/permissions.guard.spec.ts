import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  it('should allow access when no permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockExecutionContext({
      roles: ['TENANT_ADMIN'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required permission via role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PRODUCT_READ']);

    // TENANT_ADMIN has PRODUCT_READ permission
    const context = createMockExecutionContext({
      roles: ['TENANT_ADMIN'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has all required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['PRODUCT_READ', 'PRODUCT_WRITE']);

    const context = createMockExecutionContext({
      roles: ['TENANT_ADMIN'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user lacks required permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['TENANT_MANAGE']);

    // VIEWER role doesn't have TENANT_MANAGE permission
    const context = createMockExecutionContext({
      roles: ['VIEWER'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when user has no roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PRODUCT_READ']);

    const context = createMockExecutionContext({
      roles: [],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when user object is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PRODUCT_READ']);

    const context = createMockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
