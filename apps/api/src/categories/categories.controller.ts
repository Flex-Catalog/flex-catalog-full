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
import { CategoriesService } from './categories.service';
import { CurrentUser, RequirePermissions, RequireFeatures } from '../common/decorators';
import { AuthUser, AttributeTemplate } from '@product-catalog/shared';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsArray()
  @IsOptional()
  attributeTemplate?: AttributeTemplate[];
}

class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsArray()
  @IsOptional()
  attributeTemplate?: AttributeTemplate[];
}

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
@RequireFeatures('CATEGORIES')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'List all categories' })
  @ApiQuery({ name: 'tree', required: false, type: Boolean })
  @ApiQuery({ name: 'includeProducts', required: false, type: Boolean })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('tree') tree?: string,
    @Query('includeProducts') includeProducts?: string,
  ) {
    if (tree === 'true') {
      return this.categoriesService.findTree(user.tenantId);
    }
    return this.categoriesService.findAll(
      user.tenantId,
      includeProducts === 'true',
    );
  }

  @Get(':id')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get category by ID' })
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.categoriesService.findById(id, user.tenantId);
  }

  @Post()
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Create new category' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Update category' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Delete category' })
  async delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.categoriesService.delete(id, user.tenantId);
  }
}
