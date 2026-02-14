import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AffiliateService } from './affiliate.service';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '@product-catalog/shared';
import { IsString, IsOptional, IsIn, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SetMetadata } from '@nestjs/common';
import { SKIP_TENANT_CHECK_KEY } from '../../common/guards/tenant-status.guard';
import { Type } from 'class-transformer';

const SkipTenantCheck = () => SetMetadata(SKIP_TENANT_CHECK_KEY, true);

class LinkAffiliateDto {
  @ApiProperty({ example: 'affiliate@example.com', description: 'Email or CPF of the affiliate' })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'STANDARD', required: false })
  @IsString()
  @IsOptional()
  @IsIn(['STANDARD', 'PARTNER'])
  type?: 'STANDARD' | 'PARTNER';
}

class LinkAffiliatesBatchDto {
  @ApiProperty({ type: [LinkAffiliateDto], description: 'Up to 2 affiliates to link' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkAffiliateDto)
  affiliates: LinkAffiliateDto[];
}

@ApiTags('Affiliates')
@ApiBearerAuth()
@Controller('affiliates')
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  // ---- Tenant endpoints (manage affiliates linked to their company) ----

  @Post()
  @ApiOperation({ summary: 'Link an affiliate to your company (max 2)' })
  async linkAffiliate(
    @CurrentUser() user: AuthUser,
    @Body() dto: LinkAffiliateDto,
  ) {
    return this.affiliateService.linkAffiliate({
      tenantId: user.tenantId,
      identifier: dto.identifier,
      type: dto.type,
    });
  }

  @Post('batch')
  @ApiOperation({ summary: 'Link multiple affiliates at once (max 2 total)' })
  async linkAffiliatesBatch(
    @CurrentUser() user: AuthUser,
    @Body() dto: LinkAffiliatesBatchDto,
  ) {
    const results = [];
    for (const aff of dto.affiliates) {
      const result = await this.affiliateService.linkAffiliate({
        tenantId: user.tenantId,
        identifier: aff.identifier,
        type: aff.type,
      });
      results.push(result);
    }
    return results;
  }

  @Get()
  @ApiOperation({ summary: 'List affiliates linked to your company' })
  async getMyAffiliates(@CurrentUser() user: AuthUser) {
    return this.affiliateService.getAffiliatesByTenant(user.tenantId);
  }

  // ---- Affiliate dashboard (logged-in affiliate views their commissions) ----

  @Get('my/commissions')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'View my commissions (as an affiliate)' })
  async getMyCommissions(
    @CurrentUser() user: AuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.affiliateService.getCommissionsByUserEmail(user.email, +page, +limit);
  }

  @Get('my/profile')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'View my affiliate profile' })
  async getMyAffiliateProfile(@CurrentUser() user: AuthUser) {
    return this.affiliateService.getAffiliateByEmail(user.email);
  }

  // ---- Admin endpoints ----

  @Get('admin/all')
  @RequirePermissions('PLATFORM_ADMIN')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'List all affiliates (admin)' })
  async getAllAffiliates(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.affiliateService.getAllAffiliates(+page, +limit);
  }

  @Get('admin/:affiliateId/commissions')
  @RequirePermissions('PLATFORM_ADMIN')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'View commissions for an affiliate (admin)' })
  async getAffiliateCommissions(
    @Param('affiliateId') affiliateId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.affiliateService.getCommissionsByAffiliate(affiliateId, +page, +limit);
  }
}
