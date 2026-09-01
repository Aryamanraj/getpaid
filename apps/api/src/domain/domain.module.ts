import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { LoggerMiddleware } from '../common/middlewares/logger.middleware';
import { PlatformConfigModule } from '../platform-config/platform-config.module';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { DomainService } from './domain.service';
import { DomainController } from './domain.controller';

@Module({
  imports: [RepoModule, PlatformConfigModule],
  providers: [DomainService, AdminAuthGuard],
  controllers: [DomainController],
  exports: [DomainService],
})
export class DomainModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(DomainController);
  }
}
