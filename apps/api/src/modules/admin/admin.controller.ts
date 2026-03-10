import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RequirePermissions } from '../../common/decorators';
import { SetMetadata } from '@nestjs/common';
import { SKIP_TENANT_CHECK_KEY } from '../../common/guards/tenant-status.guard';

const SkipTenantCheck = () => SetMetadata(SKIP_TENANT_CHECK_KEY, true);

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@SkipTenantCheck()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @RequirePermissions('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get platform dashboard stats' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('tenants')
  @RequirePermissions('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List all tenants' })
  async getTenants(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getAllTenants(+page, +limit);
  }

  @Get('payments')
  @RequirePermissions('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get recent payments' })
  async getPayments(@Query('limit') limit = '10') {
    return this.adminService.getRecentPayments(+limit);
  }

  @Get('affiliates')
  @RequirePermissions('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get all affiliates with commission stats' })
  async getAffiliates(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getAffiliateStats(+page, +limit);
  }

  @Get('stats/monthly-revenue')
  @RequirePermissions('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Monthly active subscription count (last 12 months)' })
  async getMonthlyRevenue() {
    return this.adminService.getMonthlyRevenue();
  }
}
