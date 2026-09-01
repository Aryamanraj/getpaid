import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { redactSensitive } from '../helpers/redact.helper';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body } = req;
    const start = Date.now();

    this.logger.info(
      `http [Request]\t${method} ${originalUrl}, Body: ${JSON.stringify(
        redactSensitive(body),
      )}`,
    );

    const finish = (event: string) => {
      const { statusCode, statusMessage } = res;
      const responseTime = Date.now() - start;
      const message = ` ${event} [Response]\t${method} ${originalUrl} ${statusCode} ${statusMessage}, Response Time: ${responseTime}ms`;

      if (statusCode >= 500) return this.logger.error(message);
      if (statusCode >= 400) return this.logger.warn(message);
      return this.logger.info(`http${message}`);
    };

    res.on('finish', () => finish('FINISH'));
    res.on('close', () => finish('CLOSE'));

    next();
  }
}
