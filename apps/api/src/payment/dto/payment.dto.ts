import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreatePaymentRequestDto {
  @ApiProperty({ example: 'aryaman' })
  @IsString()
  @MaxLength(30)
  userName: string;

  @ApiProperty()
  @IsInt()
  assetId: number;

  @ApiProperty({
    example: '25.5',
    description:
      'Human amount in the asset, as a string. Converted to base units server-side',
  })
  @IsString()
  @Matches(/^\d+(\.\d+)?$/)
  @MaxLength(40)
  amount: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  payerName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  payerEmail?: string;

  @ApiProperty({ example: 'payee.id' })
  @IsString()
  @MaxLength(253)
  host: string;
}

export class SubmitTransactionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(32)
  publicId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  txHash: string;

  @ApiProperty({ enum: ['wallet', 'manual'], default: 'manual' })
  @IsOptional()
  @IsString()
  submittedVia?: 'wallet' | 'manual';
}
