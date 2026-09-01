import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { LoggerMiddleware } from '../common/middlewares/logger.middleware';
import { AuthModule } from '../auth/auth.module';
import { DomainModule } from '../domain/domain.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [RepoModule, AuthModule, DomainModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(AdminController);
  }
}
