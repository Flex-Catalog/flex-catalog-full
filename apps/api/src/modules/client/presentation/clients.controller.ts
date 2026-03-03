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
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import {
  CreateClientUseCase,
  UpdateClientUseCase,
  DeleteClientUseCase,
  GetClientQuery,
  ListClientsQuery,
  SearchClientsQuery,
} from '../application/use-cases/client.use-cases';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly createUseCase: CreateClientUseCase,
    private readonly updateUseCase: UpdateClientUseCase,
    private readonly deleteUseCase: DeleteClientUseCase,
    private readonly getQuery: GetClientQuery,
    private readonly listQuery: ListClientsQuery,
    private readonly searchQuery: SearchClientsQuery,
  ) {}

  @Get()
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'List or search clients' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async findAll(
    @CurrentUser() user: any,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
  ) {
    if (q) {
      return this.searchQuery.execute(user.tenantId, q);
    }
    return this.listQuery.execute(user.tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  /**
   * Government API proxy: CNPJ lookup via BrasilAPI
   * Returns company name, tradeName, address etc. for auto-filling the client form.
   */
  @Get('lookup/cnpj/:cnpj')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Look up CNPJ from BrasilAPI (Receita Federal)' })
  async lookupCnpj(@Param('cnpj') cnpj: string) {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) {
      throw new BadRequestException('CNPJ deve ter 14 dígitos');
    }
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`, {
      headers: { 'User-Agent': 'FlexCatalog/1.0' },
    });
    if (res.status === 404) throw new NotFoundException('CNPJ não encontrado');
    if (!res.ok) throw new BadRequestException('Erro ao consultar CNPJ');
    const d: any = await res.json();
    return {
      name: d.razao_social ?? '',
      tradeName: d.nome_fantasia || null,
      taxId: cnpj,
      phone: d.ddd_telefone_1 ? `(${d.ddd_telefone_1.slice(0, 2)}) ${d.ddd_telefone_1.slice(2)}`.trim() : null,
      email: d.email || null,
      logradouro: d.logradouro || null,
      numero: d.numero || null,
      complemento: d.complemento || null,
      bairro: d.bairro || null,
      municipio: d.municipio || null,
      uf: d.uf || null,
      cep: d.cep ? d.cep.replace(/\D/g, '') : null,
    };
  }

  /**
   * Government API proxy: CEP lookup via ViaCEP
   */
  @Get('lookup/cep/:cep')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Look up CEP from ViaCEP' })
  async lookupCep(@Param('cep') cep: string) {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) {
      throw new BadRequestException('CEP deve ter 8 dígitos');
    }
    const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    if (!res.ok) throw new BadRequestException('Erro ao consultar CEP');
    const d: any = await res.json();
    if (d.erro) throw new NotFoundException('CEP não encontrado');
    return {
      logradouro: d.logradouro || null,
      complemento: d.complemento || null,
      bairro: d.bairro || null,
      municipio: d.localidade || null,
      uf: d.uf || null,
      cep: cleaned,
    };
  }

  /**
   * Government API proxy: NCM lookup via BrasilAPI
   */
  @Get('lookup/ncm')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Search NCM codes from BrasilAPI' })
  @ApiQuery({ name: 'q', required: true })
  async lookupNcm(@Query('q') q: string) {
    if (!q || q.trim().length < 2) throw new BadRequestException('Forneça ao menos 2 caracteres');
    const res = await fetch(`https://brasilapi.com.br/api/ncm/v1?search=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': 'FlexCatalog/1.0' },
    });
    if (!res.ok) throw new BadRequestException('Erro ao consultar NCM');
    const data: any[] = await res.json();
    return (data ?? []).slice(0, 20).map((item) => ({
      code: item.codigo,
      description: item.descricao,
    }));
  }

  @Get(':id')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get client by ID' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.getQuery.execute(id, user.tenantId);
  }

  @Post()
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Create client' })
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: any, @Body() body: any) {
    return this.createUseCase.execute(user.tenantId, body);
  }

  @Patch(':id')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Update client' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.updateUseCase.execute(id, user.tenantId, body);
  }

  @Delete(':id')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Delete client' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    await this.deleteUseCase.execute(id, user.tenantId);
  }
}
