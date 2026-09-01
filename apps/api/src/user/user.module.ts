import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { LoggerMiddleware } from '../common/middlewares/logger.middleware';
import { AuthModule } from '../auth/auth.module';
import { PlatformConfigModule } from '../platform-config/platform-config.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [RepoModule, AuthModule, PlatformConfigModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(UserController);
  }
}
