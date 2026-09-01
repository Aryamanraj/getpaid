import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpsertDomainDto {
  @ApiProperty({ example: 'recv.to' })
  @IsString()
  @MaxLength(253)
  host: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  brandName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  tagline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  faviconUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  themeConfig?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  mailFromAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  aliasOfDomainId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class SetActiveDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
