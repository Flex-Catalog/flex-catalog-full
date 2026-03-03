import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SERVICE_TYPE_REPOSITORY } from './domain/repositories/service-type.repository.interface';
import { PrismaServiceTypeRepository } from './infrastructure/persistence/service-type.repository';
import {
  CreateServiceTypeUseCase,
  UpdateServiceTypeUseCase,
  DeleteServiceTypeUseCase,
  GetServiceTypeQuery,
  ListServiceTypesQuery,
} from './application/use-cases/service-type.use-cases';
import { ServiceTypesController } from './presentation/service-types.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceTypesController],
  providers: [
    { provide: SERVICE_TYPE_REPOSITORY, useClass: PrismaServiceTypeRepository },
    CreateServiceTypeUseCase,
    UpdateServiceTypeUseCase,
    DeleteServiceTypeUseCase,
    GetServiceTypeQuery,
    ListServiceTypesQuery,
  ],
  exports: [SERVICE_TYPE_REPOSITORY, ListServiceTypesQuery, GetServiceTypeQuery],
})
export class ServiceTypeModule {}
