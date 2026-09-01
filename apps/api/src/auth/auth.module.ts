import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { LoggerMiddleware } from '../common/middlewares/logger.middleware';
import { PlatformConfigModule } from '../platform-config/platform-config.module';
import { DomainModule } from '../domain/domain.module';
import { MailerModule } from '../mailer/mailer.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { UserAuthGuard } from './guards/user-auth.guard';
import { OptionalAuthGuard } from './guards/optional-auth.guard';

@Module({
  imports: [RepoModule, PlatformConfigModule, DomainModule, MailerModule],
  providers: [AuthService, AdminAuthGuard, UserAuthGuard, OptionalAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, AdminAuthGuard, UserAuthGuard, OptionalAuthGuard],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(AuthController);
  }
}
