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
import { UsersService } from './users.service';
import { CurrentUser, RequirePermissions, RequireFeatures } from '../common/decorators';
import { AuthUser, Role } from '@product-catalog/shared';
import { IsEmail, IsString, IsArray, IsOptional, IsBoolean, MinLength } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsArray()
  roles: Role[];
}

class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  roles?: Role[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@RequireFeatures('USERS')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('USER_MANAGE')
  @ApiOperation({ summary: 'List users in tenant' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAllByTenant(
      user.tenantId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post()
  @RequirePermissions('USER_MANAGE')
  @ApiOperation({ summary: 'Create new user in tenant' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('USER_MANAGE')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, user.tenantId, dto);
  }

  @Delete(':id')
  @RequirePermissions('USER_MANAGE')
  @ApiOperation({ summary: 'Delete user' })
  async delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.deleteUser(id, user.tenantId);
  }
}
