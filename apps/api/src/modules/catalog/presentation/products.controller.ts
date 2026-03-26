import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions, RequireFeatures } from '../../../common/decorators';
import { AuthUser } from '@product-catalog/shared';
import { createContext } from '../../../@core/application/use-case.interface';
import { ValidationError, NotFoundError, ConflictError } from '../../../@core/domain/result';
import { CreateProductUseCase, CreateProductDto } from '../application/use-cases/create-product/create-product.use-case';
import { UpdateProductUseCase, UpdateProductDto } from '../application/use-cases/update-product/update-product.use-case';
import { DeleteProductUseCase } from '../application/use-cases/delete-product/delete-product.use-case';
import { GetProductQuery } from '../application/use-cases/get-product/get-product.use-case';
import { ListProductsQuery } from '../application/use-cases/list-products/list-products.use-case';
import { AdjustStockUseCase, AdjustStockDto } from '../application/use-cases/adjust-stock/adjust-stock.use-case';
import { GetPriceHistoryQuery } from '../application/use-cases/get-price-history/get-price-history.use-case';
import { GetStockMovementsQuery } from '../application/use-cases/get-stock-movements/get-stock-movements.use-case';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@RequireFeatures('PRODUCTS')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly getProductQuery: GetProductQuery,
    private readonly listProductsQuery: ListProductsQuery,
    private readonly adjustStockUseCase: AdjustStockUseCase,
    private readonly getPriceHistoryQuery: GetPriceHistoryQuery,
    private readonly getStockMovementsQuery: GetStockMovementsQuery,
  ) {}

  @Get()
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'List products' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.listProductsQuery.execute({
      context: createContext(user.tenantId, user.id),
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      categoryId,
      isActive: isActive ? isActive === 'true' : undefined,
      search,
    });
    if (result.isFailure) throw this.mapError(result.error);
    return result.value;
  }

  @Get(':id')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get product by ID' })
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.getProductQuery.execute({
      context: createContext(user.tenantId, user.id),
      productId: id,
    });
    if (result.isFailure) throw this.mapError(result.error);
    return result.value;
  }

  @Post()
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Create new product' })
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    const result = await this.createProductUseCase.execute({
      context: createContext(user.tenantId, user.id),
      data: dto,
    });
    if (result.isFailure) throw this.mapError(result.error);
    return result.value;
  }

  @Patch(':id')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Update product' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const result = await this.updateProductUseCase.execute({
      context: createContext(user.tenantId, user.id),
      productId: id,
      data: dto,
    });
    if (result.isFailure) throw this.mapError(result.error);
    const getResult = await this.getProductQuery.execute({
      context: createContext(user.tenantId, user.id),
      productId: id,
    });
    return getResult.value;
  }

  @Delete(':id')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Delete product' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.deleteProductUseCase.execute({
      context: createContext(user.tenantId, user.id),
      productId: id,
    });
    if (result.isFailure) throw this.mapError(result.error);
  }

  @Post(':id/stock/adjust')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Adjust product stock quantity' })
  async adjustStock(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    const result = await this.adjustStockUseCase.execute({
      context: createContext(user.tenantId, user.id),
      productId: id,
      data: dto,
    });
    if (result.isFailure) throw this.mapError(result.error);
    return result.value;
  }

  @Get(':id/price-history')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get product price history' })
  async getPriceHistory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.getPriceHistoryQuery.execute({
      context: createContext(user.tenantId, user.id),
      productId: id,
    });
    if (result.isFailure) throw this.mapError(result.error);
    return result.value;
  }

  @Get(':id/stock-movements')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get product stock movements' })
  async getStockMovements(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.getStockMovementsQuery.execute({
      context: createContext(user.tenantId, user.id),
      productId: id,
    });
    if (result.isFailure) throw this.mapError(result.error);
    return result.value;
  }

  private mapError(error: Error): Error {
    if (error instanceof ValidationError) return new BadRequestException(error.message);
    if (error instanceof NotFoundError) return new NotFoundException(error.message);
    if (error instanceof ConflictError) return new ConflictException(error.message);
    return new BadRequestException(error.message);
  }
}
