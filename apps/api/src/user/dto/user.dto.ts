import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PresetAmountDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  assetId: number;

  @ApiProperty({ example: '5', description: 'Decimal string, never a number' })
  @IsString()
  @Matches(/^\d+(\.\d+)?$/)
  @MaxLength(32)
  amount: string;
}

export class ClaimUserNameDto {
  @ApiProperty({ example: 'aryaman' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  userName: string;
}

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2048)
  avatarUrl?: string;

  @ApiProperty({ required: false, description: 'Page accent hue, 0-359' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(359)
  accentHue?: number | null;

  @ApiProperty({ required: false, type: [PresetAmountDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => PresetAmountDto)
  presetAmounts?: PresetAmountDto[];
}
