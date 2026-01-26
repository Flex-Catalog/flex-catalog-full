import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BrazilProvider } from './providers/brazil.provider';
import { USProvider } from './providers/us.provider';
import { PortugalProvider } from './providers/portugal.provider';
import { NFeModule } from './nfe/nfe.module';

@Module({
  imports: [PrismaModule, NFeModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, BrazilProvider, USProvider, PortugalProvider],
  exports: [InvoicesService],
})
export class InvoicesModule {}
