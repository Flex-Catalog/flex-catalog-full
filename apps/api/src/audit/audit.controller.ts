import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { AuditService, AuditAction, AuditEntity } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Lista logs de auditoria com filtros
   */
  @Get()
  @RequirePermissions('AUDIT_READ')
  async findAll(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('entity') entity?: AuditEntity,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      tenantId: req.user.tenantId,
      userId,
      action,
      entity,
      entityId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * Busca histórico de uma entidade específica
   */
  @Get('entity/:entity/:entityId')
  @RequirePermissions('AUDIT_READ')
  async getEntityHistory(
    @Request() req: any,
    @Param('entity') entity: AuditEntity,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(
      req.user.tenantId,
      entity,
      entityId,
    );
  }

  /**
   * Busca atividade de um usuário
   */
  @Get('user/:userId')
  @RequirePermissions('AUDIT_READ')
  async getUserActivity(
    @Request() req: any,
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getUserActivity(
      req.user.tenantId,
      userId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * Busca estatísticas de auditoria
   */
  @Get('stats')
  @RequirePermissions('AUDIT_READ')
  async getStats(
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    return this.auditService.getStats(
      req.user.tenantId,
      days ? parseInt(days, 10) : 30,
    );
  }

  /**
   * Busca atividade recente do usuário logado
   */
  @Get('my-activity')
  async getMyActivity(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getUserActivity(
      req.user.tenantId,
      req.user.sub,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
