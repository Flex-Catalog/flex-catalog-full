import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser, RequirePermissions, RequireFeatures } from '../common/decorators';
import { AuthUser } from '@product-catalog/shared';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@RequireFeatures('REPORTS')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get dashboard report with all metrics' })
  async getDashboard(@CurrentUser() user: AuthUser) {
    return this.reportsService.getDashboardReport(user.tenantId);
  }

  @Get('products')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get products report' })
  async getProductReport(@CurrentUser() user: AuthUser) {
    return this.reportsService.getProductReport(user.tenantId);
  }

  @Get('sales')
  @RequirePermissions('INVOICE_READ')
  @ApiOperation({ summary: 'Get sales report' })
  async getSalesReport(@CurrentUser() user: AuthUser) {
    return this.reportsService.getSalesReport(user.tenantId);
  }

  @Get('categories')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get categories report' })
  async getCategoryReport(@CurrentUser() user: AuthUser) {
    return this.reportsService.getCategoryReport(user.tenantId);
  }
}
