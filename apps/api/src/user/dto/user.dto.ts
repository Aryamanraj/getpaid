import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

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
}
