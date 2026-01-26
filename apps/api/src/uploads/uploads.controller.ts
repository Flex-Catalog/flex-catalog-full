import { Controller, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { CurrentUser, RequirePermissions, RequireFeatures } from '../common/decorators';
import { AuthUser } from '@product-catalog/shared';
import { IsString, IsNotEmpty } from 'class-validator';

class GenerateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;
}

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
@RequireFeatures('UPLOADS')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('generate-url')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Generate presigned URL for file upload' })
  async generateUploadUrl(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateUploadUrlDto,
  ) {
    return this.uploadsService.generateUploadUrl(
      user.tenantId,
      dto.filename,
      dto.contentType,
    );
  }

  @Delete(':key')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Delete uploaded file' })
  async deleteFile(
    @CurrentUser() user: AuthUser,
    @Param('key') key: string,
  ) {
    // Verify key belongs to tenant
    if (!key.startsWith(`uploads/${user.tenantId}/`)) {
      throw new Error('Unauthorized: File does not belong to your tenant');
    }

    await this.uploadsService.deleteFile(key);
    return { success: true };
  }
}
