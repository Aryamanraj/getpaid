import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString, MaxLength } from 'class-validator';

export class SetPlatformConfigDto {
  @ApiProperty({ example: 'chain.eip155.8453.rpcUrls' })
  @IsString()
  @MaxLength(128)
  key: string;

  @ApiProperty({
    description:
      'The value to store. Secret keys are AES-encrypted before they are written.',
  })
  @IsDefined()
  value: unknown;
}
