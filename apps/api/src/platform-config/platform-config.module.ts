import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { LoggerMiddleware } from '../common/middlewares/logger.middleware';
import { PlatformConfigService } from './platform-config.service';
import { PlatformConfigController } from './platform-config.controller';

@Module({
  imports: [RepoModule],
  providers: [PlatformConfigService, AdminAuthGuard],
  controllers: [PlatformConfigController],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(PlatformConfigController);
  }
}
