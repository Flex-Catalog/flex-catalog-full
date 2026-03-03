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
import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import {
  CreateServiceTypeUseCase,
  UpdateServiceTypeUseCase,
  DeleteServiceTypeUseCase,
  GetServiceTypeQuery,
  ListServiceTypesQuery,
} from '../application/use-cases/service-type.use-cases';
import { ServiceTypeFiscalCodes } from '../domain/repositories/service-type.repository.interface';

interface CreateServiceTypeBody {
  name: string;
  code: string;
  description?: string;
  categoryId?: string;
  itemListaServico?: string;
  codigoTributacaoMunicipal?: string;
  aliquotaISS?: number;
  cnaeCode?: string;
  ncm?: string;
  cfop?: string;
  icmsSituacaoTributaria?: string;
  icmsOrigem?: number;
  pisSituacaoTributaria?: string;
  cofinsSituacaoTributaria?: string;
}

function extractFiscalCodes(body: CreateServiceTypeBody): ServiceTypeFiscalCodes {
  return {
    itemListaServico: body.itemListaServico || undefined,
    codigoTributacaoMunicipal: body.codigoTributacaoMunicipal || undefined,
    aliquotaISS: body.aliquotaISS !== undefined ? Number(body.aliquotaISS) : undefined,
    cnaeCode: body.cnaeCode || undefined,
    ncm: body.ncm || undefined,
    cfop: body.cfop || undefined,
    icmsSituacaoTributaria: body.icmsSituacaoTributaria || undefined,
    icmsOrigem: body.icmsOrigem !== undefined ? Number(body.icmsOrigem) : undefined,
    pisSituacaoTributaria: body.pisSituacaoTributaria || undefined,
    cofinsSituacaoTributaria: body.cofinsSituacaoTributaria || undefined,
  };
}

@ApiTags('Service Types')
@ApiBearerAuth()
@Controller('service-types')
export class ServiceTypesController {
  constructor(
    private readonly createUseCase: CreateServiceTypeUseCase,
    private readonly updateUseCase: UpdateServiceTypeUseCase,
    private readonly deleteUseCase: DeleteServiceTypeUseCase,
    private readonly getQuery: GetServiceTypeQuery,
    private readonly listQuery: ListServiceTypesQuery,
  ) {}

  @Get()
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'List service types' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.listQuery.execute(user.tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get service type by ID' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.getQuery.execute(id, user.tenantId);
  }

  @Post()
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Create service type' })
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: any, @Body() body: CreateServiceTypeBody) {
    return this.createUseCase.execute({
      tenantId: user.tenantId,
      userId: user.id,
      name: body.name,
      code: body.code,
      description: body.description,
      categoryId: body.categoryId || undefined,
      fiscalCodes: extractFiscalCodes(body),
    });
  }

  @Patch(':id')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Update service type' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.updateUseCase.execute(id, {
      tenantId: user.tenantId,
      userId: user.id,
      name: body.name,
      code: body.code,
      description: body.description,
      isActive: body.isActive,
      categoryId: body.categoryId !== undefined ? (body.categoryId || null) : undefined,
      fiscalCodes: extractFiscalCodes(body),
    });
  }

  @Delete(':id')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Delete service type' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    await this.deleteUseCase.execute(id, user.tenantId);
  }
}
