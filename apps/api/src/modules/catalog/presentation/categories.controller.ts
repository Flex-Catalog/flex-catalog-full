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
import {
  CreateCategoryUseCase,
  UpdateCategoryUseCase,
  DeleteCategoryUseCase,
  GetCategoryQuery,
  ListCategoriesQuery,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../application/use-cases/category/category.use-cases';

/**
 * Categories Controller
 */
@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
@RequireFeatures('PRODUCTS')
export class CategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly getCategoryQuery: GetCategoryQuery,
    private readonly listCategoriesQuery: ListCategoriesQuery,
  ) {}

  @Get()
  @RequirePermissions('CATEGORY_READ')
  @ApiOperation({ summary: 'List categories' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('parentId') parentId?: string,
  ) {
    const result = await this.listCategoriesQuery.execute({
      context: createContext(user.tenantId, user.id),
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      parentId,
    });

    if (result.isFailure) {
      throw this.mapError(result.error);
    }

    return result.value;
  }

  @Get(':id')
  @RequirePermissions('CATEGORY_READ')
  @ApiOperation({ summary: 'Get category by ID' })
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.getCategoryQuery.execute({
      context: createContext(user.tenantId, user.id),
      categoryId: id,
    });

    if (result.isFailure) {
      throw this.mapError(result.error);
    }

    return result.value;
  }

  @Post()
  @RequirePermissions('CATEGORY_WRITE')
  @ApiOperation({ summary: 'Create new category' })
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto) {
    const result = await this.createCategoryUseCase.execute({
      context: createContext(user.tenantId, user.id),
      data: dto,
    });

    if (result.isFailure) {
      throw this.mapError(result.error);
    }

    return result.value;
  }

  @Patch(':id')
  @RequirePermissions('CATEGORY_WRITE')
  @ApiOperation({ summary: 'Update category' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const result = await this.updateCategoryUseCase.execute({
      context: createContext(user.tenantId, user.id),
      categoryId: id,
      data: dto,
    });

    if (result.isFailure) {
      throw this.mapError(result.error);
    }

    return result.value;
  }

  @Delete(':id')
  @RequirePermissions('CATEGORY_WRITE')
  @ApiOperation({ summary: 'Delete category' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.deleteCategoryUseCase.execute({
      context: createContext(user.tenantId, user.id),
      categoryId: id,
    });

    if (result.isFailure) {
      throw this.mapError(result.error);
    }
  }

  private mapError(error: Error): Error {
    if (error instanceof ValidationError) {
      return new BadRequestException(error.message);
    }
    if (error instanceof NotFoundError) {
      return new NotFoundException(error.message);
    }
    if (error instanceof ConflictError) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
