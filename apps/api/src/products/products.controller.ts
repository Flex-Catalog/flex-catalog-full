import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CurrentUser, RequirePermissions, RequireFeatures } from '../common/decorators';
import { AuthUser, CreateProductInput, UpdateProductInput } from '@product-catalog/shared';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsObject,
  Min,
  IsArray,
} from 'class-validator';

class CreateProductDto implements CreateProductInput {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsNumber()
  @Min(0)
  priceCents: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;

  @IsObject()
  @IsOptional()
  fiscal?: Record<string, any>;
}

class UpdateProductDto implements UpdateProductInput {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  priceCents?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;

  @IsObject()
  @IsOptional()
  fiscal?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

class UpdateImagesDto {
  @IsArray()
  @IsString({ each: true })
  images: string[];
}

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@RequireFeatures('PRODUCTS')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'List products' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.productsService.findAll(
      user.tenantId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      categoryId,
      isActive ? isActive === 'true' : undefined,
    );
  }

  @Get(':id')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get product by ID' })
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.findById(id, user.tenantId);
  }

  @Post()
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Create new product' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.tenantId, user.id, dto);
  }

  @Patch(':id')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Update product' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, user.tenantId, user.id, dto);
  }

  @Delete(':id')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Delete product' })
  async delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.delete(id, user.tenantId, user.id);
  }

  @Patch(':id/images')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Update product images' })
  async updateImages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateImagesDto,
  ) {
    return this.productsService.updateImages(id, user.tenantId, dto.images);
  }
}
