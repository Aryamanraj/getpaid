import { Global, Module } from '@nestjs/common';
import { AesEncryptionService } from './aes-encryption.service';

@Global()
@Module({
  providers: [AesEncryptionService],
  exports: [AesEncryptionService],
})
export class AesEncryptionModule {}
