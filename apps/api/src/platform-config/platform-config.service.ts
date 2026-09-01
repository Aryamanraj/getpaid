import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FindOptionsWhere } from 'typeorm';
import { PlatformConfigRepoService } from '../repo/core/platform-config-repo.service';
import { PlatformConfig } from '../repo/core/entities/platform-config.entity';
import { AesEncryptionService } from '../common/services/aes-encryption.service';
import { CacheService } from '../cache/cache.service';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { Promisify } from '../common/helpers/promisifier';
import {
  CacheKeys,
  DEFAULT_CONFIG_CACHE_TTL_SECONDS,
} from '../common/constants';

interface SecretCacheEntry {
  value: unknown;
  expiresAt: number;
}

/**
 * The source of truth for every runtime setting. See
 * docs/PLATFORM_CONFIG_KEYS.md.
 *
 * Caching is deliberately split:
 *   - non-secret values go to Redis, shared across processes
 *   - secret values are decrypted into a per-process map and never leave it
 *
 * Putting plaintext secrets in Redis would give away most of the benefit of
 * encrypting them at rest, so the in-memory map is the price of that.
 */
@Injectable()
export class PlatformConfigService {
  private secretCache = new Map<string, SecretCacheEntry>();

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private platformConfigRepo: PlatformConfigRepoService,
    private aesEncryptionService: AesEncryptionService,
    private cacheService: CacheService,
  ) {}

  async getConfigByKey<T = unknown>(key: string): Promise<ResultWithError> {
    try {
      this.logger.info(`[PlatformConfigService.getConfigByKey] key: ${key}`);

      const cached = this.readSecretCache(key);
      if (cached !== undefined) return { data: cached as T, error: null };

      const fromRedis = await Promisify<T>(
        this.cacheService.get<T>(CacheKeys.platformConfig(key)),
      );
      if (fromRedis !== null && fromRedis !== undefined)
        return { data: fromRedis, error: null };

      const row = await Promisify<PlatformConfig>(
        this.platformConfigRepo.get({ where: { Key: key, IsActive: true } }),
      );

      const ttl = row.CacheTtlSeconds ?? DEFAULT_CONFIG_CACHE_TTL_SECONDS;
      const value = row.IsSecret ? this.decryptValue(row) : row.Value;

      if (row.IsSecret) {
        this.writeSecretCache(key, value, ttl);
      } else {
        await Promisify<boolean>(
          this.cacheService.set(CacheKeys.platformConfig(key), value, ttl),
        );
      }

      return { data: value as T, error: null };
    } catch (error) {
      this.logger.error(
        `[PlatformConfigService.getConfigByKey] error reading ${key}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Falls back rather than throwing — a missing optional key should not take
   * down a request path that has a sane default.
   */
  async getConfigOrDefault<T>(key: string, fallback: T): Promise<T> {
    const { data, error } = await this.getConfigByKey<T>(key);
    if (error || data === null || data === undefined) return fallback;
    return data as T;
  }

  /** Every IsPublic row, for the browser bootstrap payload. */
  async getPublicConfig(): Promise<ResultWithError> {
    try {
      this.logger.info('[PlatformConfigService.getPublicConfig] reading');

      const where: FindOptionsWhere<PlatformConfig> = {
        IsPublic: true,
        IsActive: true,
      };
      const rows = await Promisify<PlatformConfig[]>(
        this.platformConfigRepo.getAll({ where }, false),
      );

      const out: Record<string, unknown> = {};
      for (const row of rows ?? []) {
        // Belt and braces — the CHECK constraint already forbids this.
        if (row.IsSecret) continue;
        out[row.Key] = row.Value;
      }

      return { data: out, error: null };
    } catch (error) {
      this.logger.error(
        `[PlatformConfigService.getPublicConfig] error: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async setConfigByKey(
    key: string,
    value: unknown,
    updatedByUserId?: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`[PlatformConfigService.setConfigByKey] key: ${key}`);

      const row = await Promisify<PlatformConfig>(
        this.platformConfigRepo.get({ where: { Key: key } }),
      );

      if (row.IsSecret && row.IsPublic) {
        throw new GenericError(
          `PC9 violation — ${key} is both secret and public`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const stored = row.IsSecret
        ? { enc: this.aesEncryptionService.encrypt(String(value)) }
        : value;

      const { error } = await this.platformConfigRepo.update(
        { Key: key },
        {
          Value: stored,
          UpdatedByUser: updatedByUserId
            ? ({ UserID: updatedByUserId } as never)
            : null,
        },
      );
      if (error) throw error;

      await this.invalidate(key);

      return { data: true, error: null };
    } catch (error) {
      this.logger.error(
        `[PlatformConfigService.setConfigByKey] error writing ${key}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async invalidate(key: string): Promise<ResultWithError> {
    try {
      this.secretCache.delete(key);
      await Promisify<boolean>(
        this.cacheService.del(CacheKeys.platformConfig(key)),
      );
      return { data: true, error: null };
    } catch (error) {
      this.logger.error(
        `[PlatformConfigService.invalidate] error for ${key}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  private decryptValue(row: PlatformConfig): unknown {
    const raw = row.Value as unknown;
    // PC8 — seeds leave secrets as an empty placeholder until an admin sets
    // them. That is "unset", not an error.
    if (raw === null || raw === undefined || raw === '') return null;
    if (
      typeof raw !== 'object' ||
      typeof (raw as { enc?: unknown }).enc !== 'string'
    ) {
      throw new GenericError(
        `PlatformConfig key ${row.Key} is marked secret but holds no ciphertext`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const plain = this.aesEncryptionService.decrypt(
      (raw as { enc: string }).enc,
    );
    try {
      return JSON.parse(plain);
    } catch {
      return plain;
    }
  }

  private readSecretCache(key: string): unknown | undefined {
    const hit = this.secretCache.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      this.secretCache.delete(key);
      return undefined;
    }
    return hit.value;
  }

  private writeSecretCache(key: string, value: unknown, ttlSeconds: number) {
    this.secretCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}
