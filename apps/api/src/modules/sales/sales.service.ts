import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateSaleItemDto {
  productId?: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  unitCostCents?: number;
}

export interface CreateSaleDto {
  customerName: string;
  customerTaxId?: string;
  customerId?: string;
  channel?: string;
  discountCents?: number;
  shippingCents?: number;
  notes?: string;
  items: CreateSaleItemDto[];
}

export interface SaleQueryOptions {
  page: number;
  limit: number;
  status?: string;
  channel?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateSaleDto, userId: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A venda precisa ter ao menos um item');
    }

    const subtotalCents = dto.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );
    const discountCents = dto.discountCents ?? 0;
    const shippingCents = dto.shippingCents ?? 0;
    const totalCents = subtotalCents - discountCents + shippingCents;

    if (totalCents < 0) {
      throw new BadRequestException('Total da venda não pode ser negativo');
    }

    const orderNumber = await this.generateOrderNumber(tenantId);

    const sale = await this.prisma.sale.create({
      data: {
        tenantId,
        orderNumber,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerTaxId: dto.customerTaxId,
        channel: dto.channel ?? 'DIRECT',
        status: 'PENDING',
        subtotalCents,
        discountCents,
        shippingCents,
        totalCents,
        notes: dto.notes,
        stockDeducted: false,
        createdById: userId,
        updatedById: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            unitCostCents: item.unitCostCents,
            totalCents: item.unitPriceCents * item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    return this.toDto(sale);
  }

  async findAll(tenantId: string, options: SaleQueryOptions) {
    const where: any = { tenantId };

    if (options.status) where.status = options.status;
    if (options.channel) where.channel = options.channel;
    if (options.search) {
      where.OR = [
        { customerName: { contains: options.search, mode: 'insensitive' } },
        { orderNumber: { contains: options.search, mode: 'insensitive' } },
        { customerTaxId: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = new Date(options.startDate);
      if (options.endDate) where.createdAt.lte = new Date(options.endDate + 'T23:59:59');
    }

    const skip = (options.page - 1) * options.limit;
    const [records, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      data: records.map((r: any) => this.toDto(r)),
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async findOne(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException(`Venda ${id} não encontrada`);
    return this.toDto(sale);
  }

  async updateStatus(tenantId: string, id: string, status: string, userId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id, tenantId }, include: { items: true } });
    if (!sale) throw new NotFoundException(`Venda ${id} não encontrada`);

    const validTransitions: Record<string, string[]> = {
      PENDING: ['PAID', 'CANCELED'],
      PAID: ['SHIPPED', 'CANCELED', 'REFUNDED'],
      SHIPPED: ['DELIVERED', 'CANCELED', 'REFUNDED'],
      DELIVERED: ['REFUNDED'],
      CANCELED: [],
      REFUNDED: [],
    };

    if (!validTransitions[sale.status]?.includes(status)) {
      throw new BadRequestException(
        `Transição de status inválida: ${sale.status} → ${status}`,
      );
    }

    let stockDeducted = (sale as any).stockDeducted ?? false;

    // Deduct stock when sale is paid
    if (status === 'PAID' && !stockDeducted) {
      await this.deductStock(tenantId, (sale as any).items, userId, id);
      stockDeducted = true;
    }

    // Reverse stock if canceled after deduction
    if ((status === 'CANCELED' || status === 'REFUNDED') && stockDeducted) {
      await this.reverseStock(tenantId, (sale as any).items, userId, id);
      stockDeducted = false;
    }

    const updated = await this.prisma.sale.update({
      where: { id },
      data: { status, stockDeducted, updatedById: userId, updatedAt: new Date() },
      include: { items: true },
    });

    return this.toDto(updated);
  }

  async delete(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id, tenantId } });
    if (!sale) throw new NotFoundException(`Venda ${id} não encontrada`);
    if ((sale as any).status === 'PAID' || (sale as any).status === 'SHIPPED') {
      throw new BadRequestException('Não é possível excluir uma venda paga ou em trânsito');
    }
    await this.prisma.sale.delete({ where: { id } });
  }

  async getSummary(tenantId: string, period: 'day' | 'week' | 'month' | 'year') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week': {
        const day = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
      },
      include: { items: true },
    });

    const totalRevenueCents = sales.reduce((s: number, sale: any) => s + sale.totalCents, 0);
    const totalCostCents = sales.reduce((s: number, sale: any) =>
      s + (sale.items as any[]).reduce((si: number, item: any) =>
        si + (item.unitCostCents ?? 0) * item.quantity, 0), 0);
    const profitCents = totalRevenueCents - totalCostCents;
    const marginPercent = totalRevenueCents > 0
      ? Math.round((profitCents / totalRevenueCents) * 1000) / 10
      : 0;

    // Sales by channel
    const byChannel: Record<string, number> = {};
    for (const sale of sales as any[]) {
      byChannel[sale.channel] = (byChannel[sale.channel] ?? 0) + 1;
    }

    return {
      period,
      salesCount: sales.length,
      totalRevenueCents,
      totalCostCents,
      profitCents,
      marginPercent,
      byChannel,
    };
  }

  private async deductStock(tenantId: string, items: any[], userId: string, saleId: string) {
    for (const item of items) {
      if (!item.productId) continue;

      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId },
      });
      if (!product) continue;

      const newQty = (product as any).stockQuantity - item.quantity;
      if (newQty < 0) {
        throw new BadRequestException(
          `Estoque insuficiente para "${item.productName}". Disponível: ${(product as any).stockQuantity}, solicitado: ${item.quantity}`,
        );
      }

      await this.prisma.product.update({
        where: { id: item.productId },
        data: { stockQuantity: newQty, updatedById: userId, updatedAt: new Date() },
      });

      await this.prisma.stockMovement.create({
        data: {
          productId: item.productId,
          tenantId,
          type: 'OUT',
          quantity: -item.quantity,
          reason: `Venda ${saleId}`,
          saleId,
          createdById: userId,
        },
      });
    }
  }

  private async reverseStock(tenantId: string, items: any[], userId: string, saleId: string) {
    for (const item of items) {
      if (!item.productId) continue;

      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId },
      });
      if (!product) continue;

      await this.prisma.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: (product as any).stockQuantity + item.quantity,
          updatedById: userId,
          updatedAt: new Date(),
        },
      });

      await this.prisma.stockMovement.create({
        data: {
          productId: item.productId,
          tenantId,
          type: 'IN',
          quantity: item.quantity,
          reason: `Estorno - Venda ${saleId} cancelada/reembolsada`,
          saleId,
          createdById: userId,
        },
      });
    }
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.sale.count({
      where: { tenantId, createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    return `VD-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private toDto(sale: any) {
    return {
      id: sale.id,
      orderNumber: sale.orderNumber,
      customerId: sale.customerId,
      customerName: sale.customerName,
      customerTaxId: sale.customerTaxId,
      channel: sale.channel,
      status: sale.status,
      subtotalCents: sale.subtotalCents,
      discountCents: sale.discountCents,
      shippingCents: sale.shippingCents,
      totalCents: sale.totalCents,
      notes: sale.notes,
      stockDeducted: sale.stockDeducted,
      nfseData: sale.nfseData,
      items: (sale.items ?? []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        unitCostCents: item.unitCostCents,
        totalCents: item.totalCents,
      })),
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    };
  }
}
