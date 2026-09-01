import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CHAIN_NAMESPACE_ENUM } from '@recv/shared';

export class AddPayoutAddressDto {
  @ApiProperty({ enum: CHAIN_NAMESPACE_ENUM })
  @IsEnum(CHAIN_NAMESPACE_ENUM)
  namespace: CHAIN_NAMESPACE_ENUM;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  address: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  label?: string;

  @ApiProperty({
    required: false,
    description: 'Asset ids to accept at this address immediately',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  assetIds?: number[];
}

export class SetAcceptedAssetDto {
  @ApiProperty()
  @IsInt()
  assetId: number;

  @ApiProperty()
  @IsInt()
  payoutAddressId: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
