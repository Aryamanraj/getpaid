import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { VerificationService } from './verification.service';

@Injectable()
export class VerificationScheduler {
  private running = false;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private verificationService: VerificationService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const { data } = await this.verificationService.runDueJobs();
      if (data) this.logger.info(`[VerificationScheduler] ran ${data} job(s)`);
    } finally {
      this.running = false;
    }
  }
}
