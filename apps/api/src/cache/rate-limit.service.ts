import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CacheService } from './cache.service';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';

/**
 * Fixed-window counter in Redis. Degrades *open* when Redis is unreachable —
 * a cache outage should slow the API down, not lock every user out.
 */
@Injectable()
export class RateLimitService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private cacheService: CacheService,
  ) {}

  async hit(
    bucket: string,
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<ResultWithError> {
    try {
      const key = `rl:${bucket}:${identifier}`;
      const count = await this.cacheService.increment(key, windowSeconds);

      if (count === null) return { data: true, error: null };

      if (count > limit) {
        throw new GenericError(
          'Too many requests — try again shortly',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return { data: true, error: null };
    } catch (error) {
      if (!(error instanceof GenericError)) {
        this.logger.warn(
          `[RateLimitService.hit] degraded open for ${bucket}: ${error.message}`,
        );
        return { data: true, error: null };
      }
      return { data: null, error };
    }
  }
}
