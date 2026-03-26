import { Injectable } from '@nestjs/common';
import { IQuery, UseCaseContext } from '../../../../../@core/application/use-case.interface';
import { Result } from '../../../../../@core/domain/result';
import { PrismaService } from '../../../../../prisma/prisma.service';

export interface GetStockMovementsInput {
  readonly context: UseCaseContext;
  readonly productId: string;
}

export interface StockMovementEntry {
  readonly id: string;
  readonly type: string;
  readonly quantity: number;
  readonly reason: string | null;
  readonly createdAt: Date;
}

@Injectable()
export class GetStockMovementsQuery implements IQuery<GetStockMovementsInput, StockMovementEntry[]> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: GetStockMovementsInput): Promise<Result<StockMovementEntry[], Error>> {
    const records = await this.prisma.stockMovement.findMany({
      where: { productId: input.productId, tenantId: input.context.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return Result.ok(
      records.map((r: any) => ({
        id: r.id,
        type: r.type,
        quantity: r.quantity,
        reason: r.reason ?? null,
        createdAt: r.createdAt,
      })),
    );
  }
}
