import { Controller, Get, Patch, Post, Body, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Get('fiscal-config/certificate')
  @ApiOperation({ summary: 'Get digital certificate upload status' })
  async getCertificateStatus(@CurrentUser() user: AuthUser) {
    return this.tenantsService.getCertificateStatus(user.tenantId);
  }

  @Post('fiscal-config/certificate')
  @RequirePermissions('TENANT_MANAGE')
  @ApiOperation({ summary: 'Upload digital certificate (.pfx) to Focus NFe' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo'))
  async uploadCertificate(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: { buffer: Buffer; originalname?: string; mimetype?: string },
    @Body('senha') senha: string,
  ) {
    if (!file) throw new BadRequestException('Arquivo do certificado é obrigatório');
    if (!senha) throw new BadRequestException('Senha do certificado é obrigatória');
    return this.tenantsService.uploadCertificate(user.tenantId, file.buffer, senha);
  }
}
