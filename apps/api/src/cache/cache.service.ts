import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import Redis from 'ioredis';
import { ResultWithError } from '../common/interfaces';

/**
 * Nothing in Redis is authoritative — a flush costs a cold cache, not data.
 * Every method therefore degrades to a miss rather than throwing, so a Redis
 * outage slows the API down instead of taking it out.
 *
 * Secrets are never written here (docs/ARCHITECTURE.md §3) — caching plaintext
 * in a shared store would undo most of encrypting them at rest.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private client: Redis;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      maxRetriesPerRequest: 2,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 5000),
    });

    this.client.on('error', (error) => {
      this.logger.warn(`[CacheService] redis error: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    await this.client.quit().catch(() => undefined);
  }

  async get<T>(key: string): Promise<ResultWithError> {
    try {
      const raw = await this.client.get(key);
      return { data: raw ? (JSON.parse(raw) as T) : null, error: null };
    } catch (error) {
      this.logger.warn(`[CacheService.get] miss for ${key}: ${error.message}`);
      return { data: null, error: null };
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<ResultWithError> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return { data: true, error: null };
    } catch (error) {
      this.logger.warn(
        `[CacheService.set] failed for ${key}: ${error.message}`,
      );
      return { data: false, error: null };
    }
  }

  async del(...keys: string[]): Promise<ResultWithError> {
    try {
      if (keys.length) await this.client.del(...keys);
      return { data: true, error: null };
    } catch (error) {
      this.logger.warn(`[CacheService.del] failed: ${error.message}`);
      return { data: false, error: null };
    }
  }

  /** Returns the new count, or null when Redis is unreachable. */
  async increment(key: string, ttlSeconds: number): Promise<number> {
    try {
      const count = await this.client.incr(key);
      if (count === 1) await this.client.expire(key, ttlSeconds);
      return count;
    } catch (error) {
      this.logger.warn(
        `[CacheService.increment] failed for ${key}: ${error.message}`,
      );
      return null;
    }
  }

  async delByPrefix(prefix: string): Promise<ResultWithError> {
    try {
      const stream = this.client.scanStream({
        match: `${prefix}*`,
        count: 200,
      });
      const batch: string[] = [];
      for await (const keys of stream) batch.push(...(keys as string[]));
      if (batch.length) await this.client.del(...batch);
      return { data: batch.length, error: null };
    } catch (error) {
      this.logger.warn(
        `[CacheService.delByPrefix] failed for ${prefix}: ${error.message}`,
      );
      return { data: 0, error: null };
    }
  }
}
