import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import axios from 'axios';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { ResultWithError } from '../common/interfaces';
import { Promisify } from '../common/helpers/promisifier';

export interface OtpMail {
  to: string;
  code: string;
  brandName: string;
  host: string;
  ttlMinutes: number;
}

export interface PaymentConfirmedMail {
  to: string;
  brandName: string;
  host: string;
  payeeUserName: string;
  amountDisplay: string;
  assetSymbol: string;
  chainName: string;
  txHash: string;
  explorerUrl: string;
  receiptUrl: string;
  note?: string;
}

const NOVU_TRIGGER_URL = 'https://api.novu.co/v1/events/trigger';

/**
 * Novu Cloud orchestrates, Resend delivers (docs/ARCHITECTURE.md §14).
 * Nothing outside this service knows how mail is sent.
 *
 * With no Novu key configured — every fresh install — messages are logged
 * instead of sent, so local development works without any account. The OTP
 * code appears in the API log; that is the only place it is ever printed.
 */
@Injectable()
export class MailerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private platformConfigService: PlatformConfigService,
  ) {}

  async sendOtp(mail: OtpMail): Promise<ResultWithError> {
    try {
      this.logger.info(`[MailerService.sendOtp] to: ${mail.to}`);

      const workflow = await this.platformConfigService.getConfigOrDefault(
        'mail.novu.workflow.otp',
        'auth-otp',
      );

      await Promisify<boolean>(
        this.trigger(workflow, mail.to, {
          code: mail.code,
          brandName: mail.brandName,
          host: mail.host,
          ttlMinutes: mail.ttlMinutes,
        }),
      );

      return { data: true, error: null };
    } catch (error) {
      this.logger.error(
        `[MailerService.sendOtp] error for ${mail.to}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async sendPaymentConfirmed(
    mail: PaymentConfirmedMail,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`[MailerService.sendPaymentConfirmed] to: ${mail.to}`);

      const workflow = await this.platformConfigService.getConfigOrDefault(
        'mail.novu.workflow.paymentConfirmed',
        'payment-confirmed',
      );

      const { to, ...payload } = mail;
      await Promisify<boolean>(this.trigger(workflow, to, payload));

      return { data: true, error: null };
    } catch (error) {
      this.logger.error(
        `[MailerService.sendPaymentConfirmed] error for ${mail.to}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  private async trigger(
    workflow: string,
    to: string,
    payload: Record<string, unknown>,
  ): Promise<ResultWithError> {
    try {
      const provider = await this.platformConfigService.getConfigOrDefault(
        'mail.provider',
        'novu',
      );
      const apiKey =
        await this.platformConfigService.getConfigOrDefault<string>(
          'mail.novu.apiKey',
          '',
        );

      if (provider !== 'novu' || !apiKey) {
        // CT8 — the OTP is a credential. This is the single sanctioned place
        // it is written to a log, and only when no mail provider is set.
        this.logger.warn(
          `[MailerService] no mail provider configured — would send "${workflow}" to ${to}: ${JSON.stringify(payload)}`,
        );
        return { data: true, error: null };
      }

      const timeoutMs = await this.platformConfigService.getConfigOrDefault(
        'chain.rpcTimeoutMs',
        10000,
      );

      await axios.post(
        NOVU_TRIGGER_URL,
        {
          name: workflow,
          to: { subscriberId: to.toLowerCase(), email: to },
          payload,
        },
        {
          headers: { Authorization: `ApiKey ${apiKey}` },
          timeout: timeoutMs,
        },
      );

      return { data: true, error: null };
    } catch (error) {
      this.logger.error(
        `[MailerService.trigger] error for ${workflow}: ${error.message}`,
      );
      return { data: null, error };
    }
  }
}
