import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { CHAIN_NAMESPACE_ENUM } from '@recv/shared';

export class RequestOtpDto {
  @ApiProperty({ example: 'you@example.com' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ example: 'payee.id', description: 'Host the user is on' })
  @IsString()
  @MaxLength(253)
  host: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'you@example.com' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 10)
  code: string;

  @ApiProperty({ example: 'payee.id', description: 'Host the user is on' })
  @IsString()
  @MaxLength(253)
  host: string;
}

export class GetNonceDto {
  @ApiProperty({ example: '0xabc…' })
  @IsString()
  @MaxLength(128)
  address: string;

  @ApiProperty({ enum: CHAIN_NAMESPACE_ENUM, example: 'eip155' })
  @IsEnum(CHAIN_NAMESPACE_ENUM)
  namespace: CHAIN_NAMESPACE_ENUM;

  @ApiProperty({ example: 'payee.id' })
  @IsString()
  @MaxLength(253)
  host: string;
}

export class WalletLoginDto {
  @ApiProperty({ example: '0xabc…' })
  @IsString()
  @MaxLength(128)
  address: string;

  @ApiProperty({ enum: CHAIN_NAMESPACE_ENUM, example: 'eip155' })
  @IsEnum(CHAIN_NAMESPACE_ENUM)
  namespace: CHAIN_NAMESPACE_ENUM;

  @ApiProperty({ description: 'The exact message that was signed' })
  @IsString()
  @MaxLength(2048)
  message: string;

  @ApiProperty({ description: 'Hex (EVM) or base58 (Solana) signature' })
  @IsString()
  @MaxLength(512)
  signature: string;

  @ApiProperty({ example: 'payee.id', description: 'Host the user is on' })
  @IsString()
  @MaxLength(253)
  host: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @MaxLength(256)
  refreshToken: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  refreshToken?: string;
}
