import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CouponService, CreateCouponInput } from './coupon.service';
import { Public } from '../../common/decorators/public.decorator';
import { IsString, IsInt, Min, Max, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ValidateCouponDto {
  @ApiProperty({ example: 'WELCOME50' })
  @IsString()
  code: string;
}

class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER2025' })
  @IsString()
  code: string;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Max(24)
  durationMonths: number;

  @ApiProperty({ example: 100, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

@ApiTags('Coupons')
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post('validate')
  @Public()
  @ApiOperation({ summary: 'Validate a coupon code (public)' })
  async validate(@Body() dto: ValidateCouponDto) {
    return this.couponService.validate(dto.code);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new coupon (admin only)' })
  async create(@Body() dto: CreateCouponDto) {
    const input: CreateCouponInput = {
      code: dto.code,
      discountPercent: dto.discountPercent,
      durationMonths: dto.durationMonths,
      maxUses: dto.maxUses,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    };
    return this.couponService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List all coupons (admin only)' })
  async findAll() {
    return this.couponService.findAll();
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a coupon (admin only)' })
  async deactivate(@Param('id') id: string) {
    return this.couponService.deactivate(id);
  }
}
