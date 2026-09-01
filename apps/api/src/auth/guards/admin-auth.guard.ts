import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as crypto from 'node:crypto';

/**
 * x-api-key guard for admin endpoints. Compared in constant time so the header
 * cannot be brute-forced a byte at a time.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    try {
      const expected = this.configService.get<string>('ADMIN_API_KEY');
      if (!expected) throw new Error('ADMIN_API_KEY is not configured');

      const provided = req?.headers?.['x-api-key'];
      if (typeof provided !== 'string') throw new Error('Missing x-api-key');

      const a = Buffer.from(provided);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw new Error('Invalid x-api-key');
      }

      return true;
    } catch (error) {
      this.logger.error(
        `[AdminAuthGuard] rejected ${req?.method} ${req?.originalUrl}: ${error.message}`,
      );
      return false;
    }
  }
}
