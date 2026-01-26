import { Controller, Get, Patch, Body } from '@nestjs/common';
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
}
