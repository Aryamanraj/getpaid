import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as path from 'node:path';
import * as winston from 'winston';
import configuration from '../../config/configuration';
import { DBModule } from '../db/db.module';
import { RepoModule, entities } from '../repo/repo.module';
import { AesEncryptionModule } from '../common/services/aes-encryption.module';
import { CacheModule } from '../cache/cache.module';
import { PlatformConfigModule } from '../platform-config/platform-config.module';
import { DomainModule } from '../domain/domain.module';
import { AuthModule } from '../auth/auth.module';
import { HealthCheckModule } from '../health/health.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from '../mailer/mailer.module';
import { UserModule } from '../user/user.module';
import { PaymentMethodModule } from '../payment-method/payment-method.module';
import { PaymentModule } from '../payment/payment.module';
import { ChainModule } from '../chain/chain.module';
import { VerificationModule } from '../verification/verification.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    WinstonModule.forRoot({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf((info) => {
          const message = `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`;
          if (info.level === 'error')
            return winston.format.colorize().colorize('error', message);
          if (info.level === 'warn')
            return winston.format.colorize().colorize('warn', message);
          return message;
        }),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.colorize({ all: true }),
        }),
        new winston.transports.File({
          dirname: path.join('logs/'),
          filename: 'error.log',
          level: 'error',
        }),
        new winston.transports.File({
          dirname: path.join('logs/'),
          filename: 'combined.log',
        }),
      ],
    }),
    DBModule.forRoot({ entities }),
    AesEncryptionModule,
    CacheModule,
    RepoModule,
    HealthCheckModule,
    AuthModule,
    PlatformConfigModule,
    DomainModule,
    ScheduleModule.forRoot(),
    MailerModule,
    UserModule,
    PaymentMethodModule,
    PaymentModule,
    ChainModule,
    VerificationModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
