import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeaturesGuard } from './features.guard';

describe('FeaturesGuard', () => {
  let guard: FeaturesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<FeaturesGuard>(FeaturesGuard);
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

  it('should allow access when no features are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockExecutionContext({
      tenantFeatures: ['PRODUCTS'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when tenant has required feature', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PRODUCTS']);

    const context = createMockExecutionContext({
      tenantFeatures: ['PRODUCTS', 'INVOICES', 'USERS'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when tenant has all required features', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['PRODUCTS', 'INVOICES']);

    const context = createMockExecutionContext({
      tenantFeatures: ['PRODUCTS', 'INVOICES', 'USERS', 'REPORTS'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when tenant lacks required feature', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['REPORTS']);

    const context = createMockExecutionContext({
      tenantFeatures: ['PRODUCTS', 'INVOICES'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when tenant has no features', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PRODUCTS']);

    const context = createMockExecutionContext({
      tenantFeatures: [],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access when user is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PRODUCTS']);

    const context = createMockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
