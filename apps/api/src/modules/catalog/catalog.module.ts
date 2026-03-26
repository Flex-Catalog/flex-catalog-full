import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

// Repositories
import { PRODUCT_REPOSITORY } from './domain/repositories/product.repository.interface';
import { CATEGORY_REPOSITORY } from './domain/repositories/category.repository.interface';
import { PrismaProductRepository } from './infrastructure/persistence/product.repository';
import { PrismaCategoryRepository } from './infrastructure/persistence/category.repository';

// Product Use Cases
import { CreateProductUseCase } from './application/use-cases/create-product/create-product.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product/update-product.use-case';
import { DeleteProductUseCase } from './application/use-cases/delete-product/delete-product.use-case';
import { GetProductQuery } from './application/use-cases/get-product/get-product.use-case';
import { ListProductsQuery } from './application/use-cases/list-products/list-products.use-case';
import { AdjustStockUseCase } from './application/use-cases/adjust-stock/adjust-stock.use-case';
import { GetPriceHistoryQuery } from './application/use-cases/get-price-history/get-price-history.use-case';
import { GetStockMovementsQuery } from './application/use-cases/get-stock-movements/get-stock-movements.use-case';

// Category Use Cases
import {
  CreateCategoryUseCase,
  UpdateCategoryUseCase,
  DeleteCategoryUseCase,
  GetCategoryQuery,
  ListCategoriesQuery,
} from './application/use-cases/category/category.use-cases';

// Event Handlers
import {
  ProductCreatedAuditHandler,
  ProductUpdatedAuditHandler,
  ProductDeletedAuditHandler,
  CategoryCreatedAuditHandler,
  CategoryUpdatedAuditHandler,
  CategoryDeletedAuditHandler,
} from './application/event-handlers/audit-log.handler';

// Controllers
import { ProductsController } from './presentation/products.controller';
import { CategoriesController } from './presentation/categories.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, CategoriesController],
  providers: [
    // Repositories
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoryRepository },

    // Product Use Cases
    CreateProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    GetProductQuery,
    ListProductsQuery,
    AdjustStockUseCase,
    GetPriceHistoryQuery,
    GetStockMovementsQuery,

    // Category Use Cases
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    GetCategoryQuery,
    ListCategoriesQuery,

    // Event Handlers
    ProductCreatedAuditHandler,
    ProductUpdatedAuditHandler,
    ProductDeletedAuditHandler,
    CategoryCreatedAuditHandler,
    CategoryUpdatedAuditHandler,
    CategoryDeletedAuditHandler,
  ],
  exports: [
    PRODUCT_REPOSITORY,
    CATEGORY_REPOSITORY,
    GetProductQuery,
    ListProductsQuery,
    GetCategoryQuery,
    ListCategoriesQuery,
  ],
})
export class CatalogModule {}
