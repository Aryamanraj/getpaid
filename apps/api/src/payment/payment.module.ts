import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { LoggerMiddleware } from '../common/middlewares/logger.middleware';
import { AuthModule } from '../auth/auth.module';
import { PaymentMethodModule } from '../payment-method/payment-method.module';
import { DomainModule } from '../domain/domain.module';
import { PlatformConfigModule } from '../platform-config/platform-config.module';
import { ChainModule } from '../chain/chain.module';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [
    RepoModule,
    AuthModule,
    PaymentMethodModule,
    DomainModule,
    PlatformConfigModule,
    ChainModule,
  ],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(PaymentController);
  }
}
