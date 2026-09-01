import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AuthService } from '../auth.service';
import { Promisify } from '../../common/helpers/promisifier';
import { JwtPayload } from '../../common/interfaces';

/**
 * Reads the signing secret through AuthService on every request rather than
 * caching it in the constructor — the secret lives in PlatformConfig, so a
 * rotation takes effect within one cache TTL and needs no restart.
 */
@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    try {
      const token = req?.headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('Auth token not found');

      const payload = await Promisify<JwtPayload>(
        this.authService.verifyAccessToken(token),
      );

      req.userId = payload.userId;
      return true;
    } catch (error) {
      this.logger.warn(
        `[UserAuthGuard] rejected ${req?.method} ${req?.originalUrl}: ${error.message}`,
      );
      return false;
    }
  }
}
