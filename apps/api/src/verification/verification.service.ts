import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EntityManager, LessThanOrEqual } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import BigNumber from 'bignumber.js';
import {
  NormalisedTransfer,
  PAYMENT_REQUEST_STATUS_ENUM,
  TX_STATUS_ENUM,
  VERIFICATION_JOB_STATUS_ENUM,
  toDecimalString,
} from '@recv/shared';
import { VerificationJobRepoService } from '../repo/ops/verification-job-repo.service';
import { VerificationAttemptRepoService } from '../repo/ops/verification-attempt-repo.service';
import { VerificationJob } from '../repo/ops/entities/verification-job.entity';
import { VerificationAttempt } from '../repo/ops/entities/verification-attempt.entity';
import { PaymentTransaction } from '../repo/core/entities/payment-transaction.entity';
import { PaymentRequest } from '../repo/core/entities/payment-request.entity';
import { VerifierRegistry } from '../chain/verifier.registry';
import { ChainService } from '../chain/chain.service';
import {
  isNotFound,
  VerifierOutcome,
} from '../chain/verifiers/verifier.interface';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { MailerService } from '../mailer/mailer.service';
import { ResultWithError } from '../common/interfaces';
import { Promisify } from '../common/helpers/promisifier';
import { addressesEqual } from '../common/helpers/address.helper';
import { BucketSizes } from '../common/constants';

/**
 * ops.VerificationJobs is the queue. It is durable, auditable, and survives a
 * Redis flush — which is why there is no Bull here. The scheduler polls it.
 *
 * Assertion order (docs/ARCHITECTURE.md §6):
 *   1. tx exists            → otherwise retry
 *   2. tx succeeded         → otherwise failed
 *   3. recipient matches    → otherwise mismatched
 *   4. asset matches        → (implied by the verifier's amount for that asset)
 *   5. amount >= requested  → otherwise mismatched
 *   6. confirmations met    → otherwise retry
 */
@Injectable()
export class VerificationService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
    private verificationJobRepo: VerificationJobRepoService,
    private verificationAttemptRepo: VerificationAttemptRepoService,
    private verifierRegistry: VerifierRegistry,
    private chainService: ChainService,
    private platformConfigService: PlatformConfigService,
    private mailerService: MailerService,
  ) {}

  async runDueJobs(batchSize = 10): Promise<ResultWithError> {
    try {
      const jobs = await Promisify<VerificationJob[]>(
        this.verificationJobRepo.getAll(
          {
            where: {
              Status: VERIFICATION_JOB_STATUS_ENUM.QUEUED,
              NextRunAt: LessThanOrEqual(new Date()),
            },
            order: { NextRunAt: 'ASC' },
            take: batchSize,
          },
          false,
        ),
      );

      for (const job of jobs ?? []) {
        // Claim it so a second scheduler tick doesn't double-run it.
        const { error } = await this.verificationJobRepo.update(
          {
            VerificationJobID: job.VerificationJobID,
            Status: VERIFICATION_JOB_STATUS_ENUM.QUEUED,
          },
          { Status: VERIFICATION_JOB_STATUS_ENUM.RUNNING },
        );
        if (error) continue;
        await this.runJob(job.VerificationJobID);
      }

      return { data: (jobs ?? []).length, error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationService.runDueJobs] error: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async runJob(jobId: number): Promise<ResultWithError> {
    const startedAt = Date.now();
    let job: VerificationJob;
    try {
      this.logger.info(`[VerificationService.runJob] job ${jobId}`);

      job = await Promisify<VerificationJob>(
        this.verificationJobRepo.get({
          where: { VerificationJobID: jobId },
          relations: {
            PaymentTransaction: {
              PaymentRequest: {
                PayeeUser: true,
                Domain: true,
                Asset: true,
                Chain: true,
              },
              Chain: true,
              Asset: true,
            },
          },
        }),
      );

      const tx = job.PaymentTransaction;
      const request = tx.PaymentRequest;
      const chain = tx.Chain;
      const asset = tx.Asset ?? request.Asset;

      const outcome = await Promisify<VerifierOutcome>(
        this.verifierRegistry.for(chain.Namespace).verify({
          chain,
          asset,
          txHash: tx.TxHash,
          expectedTo: request.ToAddress,
        }),
      );

      if (isNotFound(outcome)) {
        await this.reschedule(job, 'Transaction not found yet');
        await this.recordAttempt(job, false, 'not-found', startedAt);
        return { data: 'retry', error: null };
      }

      const transfer = outcome as NormalisedTransfer;
      const verdict = this.judge(
        transfer,
        request,
        chain.RequiredConfirmations,
      );

      await this.entityManager.transaction(async (tm) => {
        await tm.update(
          PaymentTransaction,
          { PaymentTransactionID: tx.PaymentTransactionID },
          {
            FromAddress: transfer.from || null,
            ToAddress: transfer.to || null,
            AmountRaw: transfer.amountRaw,
            BlockNumber: String(transfer.blockNumber),
            BlockTimestamp: transfer.blockTimestamp
              ? new Date(transfer.blockTimestamp * 1000)
              : null,
            Confirmations: transfer.confirmations,
            RawPayload: transfer as unknown as Record<string, unknown>,
            Status: verdict.txStatus,
            MismatchReason: verdict.reason ?? null,
            VerifiedAt: verdict.final ? new Date() : null,
          },
        );

        if (verdict.requestStatus) {
          await tm.update(
            PaymentRequest,
            { PaymentRequestID: request.PaymentRequestID },
            { Status: verdict.requestStatus },
          );
        }

        await tm.update(
          VerificationJob,
          { VerificationJobID: job.VerificationJobID },
          verdict.final
            ? {
                Status: VERIFICATION_JOB_STATUS_ENUM.SUCCEEDED,
                LastError: null,
              }
            : await this.nextRun(job, verdict.reason),
        );
      });

      await this.recordAttempt(
        job,
        verdict.final,
        verdict.reason ?? 'ok',
        startedAt,
      );

      if (verdict.requestStatus === PAYMENT_REQUEST_STATUS_ENUM.CONFIRMED) {
        await this.notifyConfirmed(request, tx, transfer);
      }

      return { data: verdict, error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationService.runJob] error for job ${jobId}: ${error.stack}`,
      );
      if (job) {
        await this.reschedule(job, error.message);
        await this.recordAttempt(
          job,
          false,
          `error: ${error.message}`,
          startedAt,
        );
      }
      return { data: null, error };
    }
  }

  private judge(
    transfer: NormalisedTransfer,
    request: PaymentRequest,
    requiredConfirmations: number,
  ): {
    final: boolean;
    txStatus: TX_STATUS_ENUM;
    requestStatus?: PAYMENT_REQUEST_STATUS_ENUM;
    reason?: string;
  } {
    if (!transfer.succeeded) {
      return {
        final: true,
        txStatus: TX_STATUS_ENUM.FAILED,
        requestStatus: PAYMENT_REQUEST_STATUS_ENUM.FAILED,
        reason: 'Transaction reverted on-chain',
      };
    }

    if (
      !addressesEqual(request.Chain.Namespace, transfer.to, request.ToAddress)
    ) {
      return {
        final: true,
        txStatus: TX_STATUS_ENUM.MISMATCHED,
        requestStatus: PAYMENT_REQUEST_STATUS_ENUM.FAILED,
        reason: 'Transaction did not pay the requested address',
      };
    }

    const expected = new BigNumber(request.AmountRaw);
    const actual = new BigNumber(transfer.amountRaw);
    if (actual.lt(expected)) {
      return {
        final: true,
        txStatus: TX_STATUS_ENUM.MISMATCHED,
        requestStatus: PAYMENT_REQUEST_STATUS_ENUM.FAILED,
        reason: `Paid ${toDecimalString(actual.toFixed(0), request.Asset.Decimals)} but ${toDecimalString(expected.toFixed(0), request.Asset.Decimals)} ${request.Asset.Symbol} was requested`,
      };
    }

    if (transfer.confirmations < requiredConfirmations) {
      return {
        final: false,
        txStatus: TX_STATUS_ENUM.PENDING,
        reason: `${transfer.confirmations}/${requiredConfirmations} confirmations`,
      };
    }

    return {
      final: true,
      txStatus: TX_STATUS_ENUM.CONFIRMED,
      requestStatus: PAYMENT_REQUEST_STATUS_ENUM.CONFIRMED,
    };
  }

  private async nextRun(
    job: VerificationJob,
    reason: string,
  ): Promise<Partial<VerificationJob>> {
    const maxAttempts = await this.platformConfigService.getConfigOrDefault(
      'verification.maxAttempts',
      40,
    );
    const ladder = await this.platformConfigService.getConfigOrDefault<
      number[]
    >('verification.backoffSeconds', [5, 10, 30, 60, 120, 300]);
    const attempt = job.AttemptCount + 1;

    if (attempt >= maxAttempts) {
      return {
        Status: VERIFICATION_JOB_STATUS_ENUM.FAILED,
        AttemptCount: attempt,
        LastError: `Gave up after ${attempt} attempts: ${reason}`,
      };
    }

    const delay = ladder[Math.min(attempt - 1, ladder.length - 1)] ?? 300;
    return {
      Status: VERIFICATION_JOB_STATUS_ENUM.QUEUED,
      AttemptCount: attempt,
      NextRunAt: new Date(Date.now() + delay * Number(BucketSizes.ONE_SECOND)),
      LastError: reason,
    };
  }

  private async reschedule(job: VerificationJob, reason: string) {
    await this.verificationJobRepo.update(
      { VerificationJobID: job.VerificationJobID },
      await this.nextRun(job, reason),
    );
  }

  private async recordAttempt(
    job: VerificationJob,
    succeeded: boolean,
    outcome: string,
    startedAt: number,
  ) {
    await this.verificationAttemptRepo.create({
      VerificationJob: job,
      AttemptNumber: job.AttemptCount + 1,
      Succeeded: succeeded,
      DurationMs: Date.now() - startedAt,
      Outcome: outcome.slice(0, 1024),
    } as Partial<VerificationAttempt>);
  }

  private async notifyConfirmed(
    request: PaymentRequest,
    tx: PaymentTransaction,
    transfer: NormalisedTransfer,
  ) {
    const payee = request.PayeeUser;
    const domain = request.Domain;
    const host = domain?.Host ?? 'payee.id';
    const receiptUrl = `https://${host}/r/${request.PublicID}`;

    const identities = await this.entityManager.query(
      `SELECT "Identifier" FROM core."AuthIdentities" WHERE "UserID" = $1 AND "Provider" = 'email' ORDER BY "IsPrimary" DESC LIMIT 1`,
      [payee.UserID],
    );
    const recipients = [identities?.[0]?.Identifier, request.PayerEmail].filter(
      Boolean,
    );

    for (const to of recipients) {
      await this.mailerService.sendPaymentConfirmed({
        to,
        brandName: domain?.BrandName ?? host,
        host,
        payeeUserName: payee.UserName,
        amountDisplay: toDecimalString(
          transfer.amountRaw,
          request.Asset.Decimals,
        ),
        assetSymbol: request.Asset.Symbol,
        chainName: request.Chain.Name,
        txHash: tx.TxHash,
        explorerUrl: this.chainService.explorerUrl(request.Chain, tx.TxHash),
        receiptUrl,
        note: request.Note,
      });
    }
  }
}
