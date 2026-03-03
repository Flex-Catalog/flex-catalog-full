import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CLIENT_REPOSITORY } from './domain/repositories/client.repository.interface';
import { PrismaClientRepository } from './infrastructure/persistence/client.repository';
import {
  CreateClientUseCase,
  UpdateClientUseCase,
  DeleteClientUseCase,
  GetClientQuery,
  ListClientsQuery,
  SearchClientsQuery,
} from './application/use-cases/client.use-cases';
import { ClientsController } from './presentation/clients.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ClientsController],
  providers: [
    { provide: CLIENT_REPOSITORY, useClass: PrismaClientRepository },
    CreateClientUseCase,
    UpdateClientUseCase,
    DeleteClientUseCase,
    GetClientQuery,
    ListClientsQuery,
    SearchClientsQuery,
  ],
  exports: [CLIENT_REPOSITORY, SearchClientsQuery],
})
export class ClientModule {}
