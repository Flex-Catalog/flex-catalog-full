import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ISSUE'
  | 'CANCEL'
  | 'LOGIN'
  | 'LOGOUT'
  | 'STATUS_CHANGE';

export type AuditEntity =
  | 'Product'
  | 'Category'
  | 'Invoice'
  | 'User'
  | 'Tenant';

export interface AuditLogInput {
  tenantId: string;
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  entityName?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AuditLogFilters {
  tenantId: string;
  userId?: string;
  action?: AuditAction;
  entity?: AuditEntity;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra uma ação no log de auditoria
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          entityName: input.entityName,
          oldData: input.oldData || undefined,
          newData: input.newData || undefined,
          metadata: input.metadata || undefined,
        },
      });
    } catch (error) {
      // Não falha a operação principal se o log falhar
      this.logger.error('Erro ao registrar audit log', error);
    }
  }

  /**
   * Busca logs de auditoria com filtros
   */
  async findAll(filters: AuditLogFilters) {
    const {
      tenantId,
      userId,
      action,
      entity,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = { tenantId };

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca histórico de um recurso específico
   */
  async getEntityHistory(tenantId: string, entity: AuditEntity, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        entity,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Busca atividade recente de um usuário
   */
  async getUserActivity(tenantId: string, userId: string, limit = 20) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId,
        userId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Busca estatísticas de auditoria
   */
  async getStats(tenantId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [byAction, byEntity, byUser, total] = await Promise.all([
      // Contagem por ação
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { tenantId, createdAt: { gte: startDate } },
        _count: { action: true },
      }),
      // Contagem por entidade
      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where: { tenantId, createdAt: { gte: startDate } },
        _count: { entity: true },
      }),
      // Top usuários ativos
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { tenantId, createdAt: { gte: startDate } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
      // Total de registros
      this.prisma.auditLog.count({
        where: { tenantId, createdAt: { gte: startDate } },
      }),
    ]);

    // Busca nomes dos usuários
    const userIds = byUser.map((u) => u.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      period: { days, startDate, endDate: new Date() },
      total,
      byAction: byAction.map((a) => ({
        action: a.action,
        count: a._count.action,
      })),
      byEntity: byEntity.map((e) => ({
        entity: e.entity,
        count: e._count.entity,
      })),
      byUser: byUser.map((u) => ({
        user: userMap.get(u.userId),
        count: u._count.userId,
      })),
    };
  }
}
