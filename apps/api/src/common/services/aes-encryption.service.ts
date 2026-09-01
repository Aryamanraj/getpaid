import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // bytes

/**
 * AES-256-GCM encrypt / decrypt for every IsSecret row in core.PlatformConfig
 * and for encrypted PaymentMethod details.
 *
 * Storage format: <iv_base64>:<authTag_base64>:<ciphertext_base64>
 *
 * Uses AES_ENCRYPTION_KEY from the env file (64-char hex / 32 bytes). This key
 * is the one value that must never be in the database, in git, or in a log
 * line — it decrypts every secret we hold.
 */
@Injectable()
export class AesEncryptionService implements OnModuleInit {
  private key: Buffer;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    this.logger.info(
      '[AesEncryptionService.onModuleInit] Validating AES_ENCRYPTION_KEY',
    );
    this.key = AesEncryptionService.parseKey(
      this.configService.get<string>('AES_ENCRYPTION_KEY'),
    );
  }

  static parseKey(hex: string): Buffer {
    if (!hex || hex.length !== KEY_LENGTH * 2) {
      throw new Error(
        `AES_ENCRYPTION_KEY must be a ${KEY_LENGTH * 2}-character hex string (${KEY_LENGTH} bytes). Got length: ${hex?.length ?? 0}`,
      );
    }
    return Buffer.from(hex, 'hex');
  }

  static encryptWith(key: Buffer, plain: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  static decryptWith(key: Buffer, stored: string): string {
    const parts = stored.split(':');
    if (parts.length !== 3) {
      throw new Error(
        'Invalid encrypted value format — expected iv:authTag:ciphertext',
      );
    }
    const [ivB64, authTagB64, ciphertextB64] = parts;
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
    return (
      decipher.update(Buffer.from(ciphertextB64, 'base64'), undefined, 'utf8') +
      decipher.final('utf8')
    );
  }

  encrypt(plain: string): string {
    return AesEncryptionService.encryptWith(this.key, plain);
  }

  decrypt(stored: string): string {
    return AesEncryptionService.decryptWith(this.key, stored);
  }
}
