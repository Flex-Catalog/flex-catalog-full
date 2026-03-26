import { Injectable } from '@nestjs/common';
import { IQuery, UseCaseContext } from '../../../../../@core/application/use-case.interface';
import { Result } from '../../../../../@core/domain/result';
import { PrismaService } from '../../../../../prisma/prisma.service';

export interface GetPriceHistoryInput {
  readonly context: UseCaseContext;
  readonly productId: string;
}

export interface PriceHistoryEntry {
  readonly id: string;
  readonly priceCents: number;
  readonly costCents: number | null;
  readonly marginPercent: number | null;
  readonly reason: string | null;
  readonly createdAt: Date;
}

@Injectable()
export class GetPriceHistoryQuery implements IQuery<GetPriceHistoryInput, PriceHistoryEntry[]> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: GetPriceHistoryInput): Promise<Result<PriceHistoryEntry[], Error>> {
    const records = await this.prisma.productPriceHistory.findMany({
      where: { productId: input.productId, tenantId: input.context.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return Result.ok(
      records.map((r: any) => ({
        id: r.id,
        priceCents: r.priceCents,
        costCents: r.costCents ?? null,
        marginPercent:
          r.costCents != null && r.priceCents > 0
            ? Math.round(((r.priceCents - r.costCents) / r.priceCents) * 1000) / 10
            : null,
        reason: r.reason ?? null,
        createdAt: r.createdAt,
      })),
    );
  }
}
