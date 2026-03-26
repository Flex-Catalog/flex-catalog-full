import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '@product-catalog/shared';
import { SalesService, CreateSaleDto } from './sales.service';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @RequirePermissions('SALE_READ')
  @ApiOperation({ summary: 'List sales' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.findAll(user.tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      channel,
      search,
      startDate,
      endDate,
    });
  }

  @Get('summary')
  @RequirePermissions('SALE_READ')
  @ApiOperation({ summary: 'Get sales summary by period' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month', 'year'] })
  async getSummary(
    @CurrentUser() user: AuthUser,
    @Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month',
  ) {
    return this.salesService.getSummary(user.tenantId, period);
  }

  @Get(':id')
  @RequirePermissions('SALE_READ')
  @ApiOperation({ summary: 'Get sale by ID' })
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.salesService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermissions('SALE_WRITE')
  @ApiOperation({ summary: 'Create new sale' })
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateSaleDto) {
    return this.salesService.create(user.tenantId, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions('SALE_WRITE')
  @ApiOperation({ summary: 'Update sale status' })
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.salesService.updateStatus(user.tenantId, id, body.status, user.id);
  }

  @Delete(':id')
  @RequirePermissions('SALE_WRITE')
  @ApiOperation({ summary: 'Delete sale' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.salesService.delete(user.tenantId, id);
  }
}
