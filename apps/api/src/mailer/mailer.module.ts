import { Module } from '@nestjs/common';
import { PlatformConfigModule } from '../platform-config/platform-config.module';
import { MailerService } from './mailer.service';

@Module({
  imports: [PlatformConfigModule],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
