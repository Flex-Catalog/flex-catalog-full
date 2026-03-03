import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  IClientRepository,
  ClientEntity,
  CreateClientData,
  UpdateClientData,
  ClientQueryOptions,
  PaginatedClients,
} from '../../domain/repositories/client.repository.interface';

@Injectable()
export class PrismaClientRepository implements IClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(record: any): ClientEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      tradeName: record.tradeName ?? null,
      taxId: record.taxId ?? null,
      email: record.email ?? null,
      phone: record.phone ?? null,
      logradouro: record.logradouro ?? null,
      numero: record.numero ?? null,
      complemento: record.complemento ?? null,
      bairro: record.bairro ?? null,
      municipio: record.municipio ?? null,
      uf: record.uf ?? null,
      cep: record.cep ?? null,
      notes: record.notes ?? null,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async findById(id: string, tenantId: string): Promise<ClientEntity | null> {
    const record = await this.prisma.client.findFirst({ where: { id, tenantId } });
    return record ? this.toEntity(record) : null;
  }

  async findAll(tenantId: string, options: ClientQueryOptions): Promise<PaginatedClients> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (options.isActive !== undefined) where.isActive = options.isActive;
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { tradeName: { contains: options.search, mode: 'insensitive' } },
        { taxId: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: data.map((r) => this.toEntity(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async search(tenantId: string, q: string): Promise<ClientEntity[]> {
    const records = await this.prisma.client.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { tradeName: { contains: q, mode: 'insensitive' } },
          { taxId: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 10,
    });
    return records.map((r) => this.toEntity(r));
  }

  async create(data: CreateClientData): Promise<ClientEntity> {
    const record = await this.prisma.client.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        tradeName: data.tradeName ?? null,
        taxId: data.taxId ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        logradouro: data.logradouro ?? null,
        numero: data.numero ?? null,
        complemento: data.complemento ?? null,
        bairro: data.bairro ?? null,
        municipio: data.municipio ?? null,
        uf: data.uf ?? null,
        cep: data.cep ?? null,
        notes: data.notes ?? null,
        isActive: true,
      },
    });
    return this.toEntity(record);
  }

  async update(id: string, tenantId: string, data: UpdateClientData): Promise<ClientEntity> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.tradeName !== undefined) updateData.tradeName = data.tradeName;
    if (data.taxId !== undefined) updateData.taxId = data.taxId;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.logradouro !== undefined) updateData.logradouro = data.logradouro;
    if (data.numero !== undefined) updateData.numero = data.numero;
    if (data.complemento !== undefined) updateData.complemento = data.complemento;
    if (data.bairro !== undefined) updateData.bairro = data.bairro;
    if (data.municipio !== undefined) updateData.municipio = data.municipio;
    if (data.uf !== undefined) updateData.uf = data.uf;
    if (data.cep !== undefined) updateData.cep = data.cep;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const record = await this.prisma.client.update({ where: { id }, data: updateData });
    return this.toEntity(record);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.client.delete({ where: { id } });
  }

  async existsWithTaxId(taxId: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const record = await this.prisma.client.findFirst({
      where: {
        tenantId,
        taxId,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!record;
  }
}
