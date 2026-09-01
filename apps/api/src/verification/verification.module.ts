import { Module } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { ChainModule } from '../chain/chain.module';
import { PlatformConfigModule } from '../platform-config/platform-config.module';
import { MailerModule } from '../mailer/mailer.module';
import { VerificationService } from './verification.service';
import { VerificationScheduler } from './verification.scheduler';

@Module({
  imports: [RepoModule, ChainModule, PlatformConfigModule, MailerModule],
  providers: [VerificationService, VerificationScheduler],
  exports: [VerificationService],
})
export class VerificationModule {}
