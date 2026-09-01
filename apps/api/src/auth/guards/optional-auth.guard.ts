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

/** Sets req.userId when a valid token is present; never blocks. */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req?.headers?.authorization?.split(' ')[1];
    if (!token) return true;

    try {
      const payload = await Promisify<JwtPayload>(
        this.authService.verifyAccessToken(token),
      );
      req.userId = payload.userId;
    } catch (error) {
      this.logger.warn(`[OptionalAuthGuard] ignoring token: ${error.message}`);
    }
    return true;
  }
}
