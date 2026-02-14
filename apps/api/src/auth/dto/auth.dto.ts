import { IsEmail, IsString, MinLength, IsOptional, IsArray, ValidateNested, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class AffiliateIdentifierDto {
  @ApiProperty({ example: 'affiliate@example.com', description: 'Email or CPF' })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'STANDARD', required: false })
  @IsString()
  @IsOptional()
  @IsIn(['STANDARD', 'PARTNER'])
  type?: 'STANDARD' | 'PARTNER';
}

export class RegisterDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  companyName: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  country: string;

  @ApiProperty({ example: 'en', required: false })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'securepassword123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '12.345.678/0001-90', required: false })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({ example: 'WELCOME50', required: false })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiProperty({ type: [AffiliateIdentifierDto], required: false, description: 'Up to 2 affiliates' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AffiliateIdentifierDto)
  affiliates?: AffiliateIdentifierDto[];

  @ApiProperty({ required: false, description: 'Affiliate invite token (if registering via invite)' })
  @IsString()
  @IsOptional()
  inviteToken?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securepassword123' })
  @IsString()
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
