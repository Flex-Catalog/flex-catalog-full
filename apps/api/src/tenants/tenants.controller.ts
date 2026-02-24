import { Controller, Get, Patch, Body, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { AuthUser } from '@product-catalog/shared';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current tenant info' })
  async getCurrentTenant(@CurrentUser() user: AuthUser) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Patch('me')
  @RequirePermissions('TENANT_MANAGE')
  @ApiOperation({ summary: 'Update current tenant' })
  async updateCurrentTenant(
    @CurrentUser() user: AuthUser,
    @Body() data: { name?: string },
  ) {
    return this.tenantsService.update(user.tenantId, data);
  }

  @Get('fiscal-config')
  @ApiOperation({ summary: 'Get fiscal configuration for current tenant' })
  async getFiscalConfig(@CurrentUser() user: AuthUser) {
    const config = await this.tenantsService.getFiscalConfig(user.tenantId);
    return config ?? {};
  }

  @Patch('fiscal-config')
  @RequirePermissions('TENANT_MANAGE')
  @ApiOperation({ summary: 'Update fiscal configuration for current tenant' })
  async updateFiscalConfig(
    @CurrentUser() user: AuthUser,
    @Body() data: Record<string, unknown>,
  ) {
    // Get existing config and merge (partial update)
    const existing = (await this.tenantsService.getFiscalConfig(user.tenantId)) ?? {};
    const merged = { ...existing, ...data };
    const result = await this.tenantsService.updateFiscalConfig(user.tenantId, merged);
    return result.fiscalConfig ?? {};
  }
}
