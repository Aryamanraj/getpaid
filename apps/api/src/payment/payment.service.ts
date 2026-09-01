import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EntityManager, FindOptionsWhere } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import BigNumber from 'bignumber.js';
import { customAlphabet } from 'nanoid';
import {
  PAYMENT_REQUEST_STATUS_ENUM,
  PaymentRequestView,
  TX_STATUS_ENUM,
  TX_SUBMISSION_ENUM,
  VERIFICATION_JOB_STATUS_ENUM,
  buildPaymentUri,
  normaliseUserName,
  toDecimalString,
} from '@recv/shared';
import { PaymentRequestRepoService } from '../repo/core/payment-request-repo.service';
import { PaymentTransactionRepoService } from '../repo/core/payment-transaction-repo.service';
import { PaymentRequest } from '../repo/core/entities/payment-request.entity';
import { PaymentTransaction } from '../repo/core/entities/payment-transaction.entity';
import { VerificationJob } from '../repo/ops/entities/verification-job.entity';
import { AcceptedAsset } from '../repo/core/entities/accepted-asset.entity';
import { Domain } from '../repo/core/entities/domain.entity';
import { PaymentMethodService } from '../payment-method/payment-method.service';
import { DomainService } from '../domain/domain.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { ChainService } from '../chain/chain.service';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { Promisify } from '../common/helpers/promisifier';
import { BucketSizes } from '../common/constants';
import { CreatePaymentRequestDto } from './dto/payment.dto';

const publicId = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 14);

@Injectable()
export class PaymentService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
    private paymentRequestRepo: PaymentRequestRepoService,
    private paymentTransactionRepo: PaymentTransactionRepoService,
    private paymentMethodService: PaymentMethodService,
    private domainService: DomainService,
    private platformConfigService: PlatformConfigService,
    private chainService: ChainService,
  ) {}

  async createRequest(dto: CreatePaymentRequestDto): Promise<ResultWithError> {
    try {
      const userName = normaliseUserName(dto.userName);
      this.logger.info(
        `[PaymentService.createRequest] payee ${userName} asset ${dto.assetId}`,
      );

      const accepted = await Promisify<AcceptedAsset>(
        this.paymentMethodService.resolveAcceptedAsset(userName, dto.assetId),
      );

      // SV13 — bignumber only; the amount never touches a JS number.
      const amountRaw = new BigNumber(dto.amount)
        .shiftedBy(accepted.Asset.Decimals)
        .integerValue(BigNumber.ROUND_DOWN);
      if (!amountRaw.isFinite() || amountRaw.lte(0))
        throw new GenericError(
          'Amount must be positive',
          HttpStatus.BAD_REQUEST,
        );

      const noteMax = await this.platformConfigService.getConfigOrDefault(
        'payment.note.maxLength',
        140,
      );
      if (dto.note && dto.note.length > noteMax)
        throw new GenericError(
          `Note must be at most ${noteMax} characters`,
          HttpStatus.BAD_REQUEST,
        );

      const ttlMinutes = await this.platformConfigService.getConfigOrDefault(
        'payment.request.ttlMinutes',
        60,
      );
      const domain = await Promisify<Domain>(
        this.domainService.getByHost(dto.host),
      );

      const request = await Promisify<PaymentRequest>(
        this.paymentRequestRepo.create({
          PublicID: publicId(),
          PayeeUser: accepted.User,
          Domain: domain,
          Asset: accepted.Asset,
          Chain: accepted.Asset.Chain,
          ToAddress: accepted.PayoutAddress.Address,
          AmountRaw: amountRaw.toFixed(0),
          Note: dto.note,
          PayerName: dto.payerName,
          PayerEmail: dto.payerEmail?.toLowerCase(),
          Status: PAYMENT_REQUEST_STATUS_ENUM.PENDING,
          ExpiresAt: new Date(
            Date.now() + ttlMinutes * Number(BucketSizes.ONE_MINUTE),
          ),
        }),
      );

      return await this.getRequest(request.PublicID);
    } catch (error) {
      this.logger.error(
        `[PaymentService.createRequest] error for ${dto.userName}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getRequest(id: string): Promise<ResultWithError> {
    try {
      this.logger.info(`[PaymentService.getRequest] ${id}`);

      const request = await Promisify<PaymentRequest>(
        this.paymentRequestRepo.get(
          {
            where: { PublicID: id },
            relations: {
              PayeeUser: true,
              Asset: true,
              Chain: true,
              PaymentTransactions: true,
            },
          },
          false,
        ),
      );
      if (!request)
        throw new GenericError('No such payment request', HttpStatus.NOT_FOUND);

      // Lazy expiry — no cron needed for a status nobody is waiting on.
      if (
        request.Status === PAYMENT_REQUEST_STATUS_ENUM.PENDING &&
        request.ExpiresAt &&
        request.ExpiresAt.getTime() < Date.now()
      ) {
        await this.paymentRequestRepo.update(
          { PaymentRequestID: request.PaymentRequestID },
          { Status: PAYMENT_REQUEST_STATUS_ENUM.EXPIRED },
        );
        request.Status = PAYMENT_REQUEST_STATUS_ENUM.EXPIRED;
      }

      return { data: this.toView(request), error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentService.getRequest] error for ${id}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async submitTransaction(
    id: string,
    txHashInput: string,
    submittedVia: TX_SUBMISSION_ENUM,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`[PaymentService.submitTransaction] ${id}`);

      const request = await Promisify<PaymentRequest>(
        this.paymentRequestRepo.get({
          where: { PublicID: id },
          relations: { Chain: true, Asset: true, PaymentTransactions: true },
        }),
      );

      if (
        request.Status === PAYMENT_REQUEST_STATUS_ENUM.CONFIRMED ||
        request.Status === PAYMENT_REQUEST_STATUS_ENUM.EXPIRED
      )
        throw new GenericError(
          `This request is already ${request.Status}`,
          HttpStatus.CONFLICT,
        );

      const allowManual = await this.platformConfigService.getConfigOrDefault(
        'payment.allowManualTxHash',
        true,
      );
      if (submittedVia === TX_SUBMISSION_ENUM.MANUAL && !allowManual)
        throw new GenericError(
          'Manual hash submission is disabled',
          HttpStatus.FORBIDDEN,
        );

      const txHash = this.normaliseTxHash(request, txHashInput);

      // A hash can only ever settle one request — the unique index is the
      // arbiter, but a clear message beats a 23505.
      const dup = await Promisify<PaymentTransaction>(
        this.paymentTransactionRepo.get(
          {
            where: {
              Chain: { ChainID: request.Chain.ChainID },
              TxHash: txHash,
            },
            relations: { PaymentRequest: true },
          },
          false,
        ),
      );
      if (
        dup &&
        dup.PaymentRequest.PaymentRequestID !== request.PaymentRequestID
      )
        throw new GenericError(
          'That transaction has already been used for another payment',
          HttpStatus.CONFLICT,
        );
      if (dup) return await this.getRequest(id);

      await this.entityManager.transaction(async (tm) => {
        const tx = await tm.save(
          tm.create(PaymentTransaction, {
            PaymentRequest: request,
            Chain: request.Chain,
            Asset: request.Asset,
            TxHash: txHash,
            Status: TX_STATUS_ENUM.PENDING,
            SubmittedVia: submittedVia,
          }),
        );
        await tm.save(
          tm.create(VerificationJob, {
            PaymentTransaction: tx,
            Status: VERIFICATION_JOB_STATUS_ENUM.QUEUED,
            NextRunAt: new Date(),
          }),
        );
        await tm.update(
          PaymentRequest,
          { PaymentRequestID: request.PaymentRequestID },
          { Status: PAYMENT_REQUEST_STATUS_ENUM.SUBMITTED },
        );
      });

      return await this.getRequest(id);
    } catch (error) {
      this.logger.error(
        `[PaymentService.submitTransaction] error for ${id}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async listForPayee(
    userId: number,
    limit = 50,
    offset = 0,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`[PaymentService.listForPayee] user ${userId}`);

      const where: FindOptionsWhere<PaymentRequest> = {
        PayeeUser: { UserID: userId },
      };
      const rows = await Promisify<PaymentRequest[]>(
        this.paymentRequestRepo.getAll(
          {
            where,
            relations: {
              PayeeUser: true,
              Asset: true,
              Chain: true,
              PaymentTransactions: true,
            },
            order: { CreatedAt: 'DESC' },
            take: Math.min(limit, 200),
            skip: offset,
          },
          false,
        ),
      );
      const total = await Promisify<number>(
        this.paymentRequestRepo.count({ where }),
      );

      return {
        data: { items: (rows ?? []).map((r) => this.toView(r)), total },
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `[PaymentService.listForPayee] error for ${userId}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  toView(request: PaymentRequest): PaymentRequestView {
    const asset = request.Asset;
    const chain = request.Chain;
    const latest = [...(request.PaymentTransactions ?? [])].sort(
      (a, b) => b.CreatedAt.getTime() - a.CreatedAt.getTime(),
    )[0];

    return {
      publicId: request.PublicID,
      status: request.Status,
      payee: {
        userName: request.PayeeUser?.UserName,
        displayName: request.PayeeUser?.DisplayName,
        avatarUrl: request.PayeeUser?.AvatarUrl,
      },
      asset: {
        assetId: asset.AssetID,
        chainId: chain.ChainID,
        symbol: asset.Symbol,
        name: asset.Name,
        contractAddress: asset.ContractAddress,
        decimals: asset.Decimals,
        logoUrl: asset.LogoUrl,
        isStablecoin: asset.IsStablecoin,
      },
      chain: {
        chainId: chain.ChainID,
        namespace: chain.Namespace,
        chainRef: chain.ChainRef,
        name: chain.Name,
        slug: chain.Slug,
        nativeSymbol: chain.NativeSymbol,
        nativeDecimals: chain.NativeDecimals,
        explorerTxUrlTemplate: chain.ExplorerTxUrlTemplate,
      },
      toAddress: request.ToAddress,
      amountRaw: request.AmountRaw,
      amountDisplay: toDecimalString(request.AmountRaw, asset.Decimals),
      note: request.Note,
      payerName: request.PayerName,
      paymentUri: buildPaymentUri({
        namespace: chain.Namespace,
        chainRef: chain.ChainRef,
        toAddress: request.ToAddress,
        amountRaw: request.AmountRaw,
        decimals: asset.Decimals,
        contractAddress: asset.ContractAddress,
      }),
      expiresAt: request.ExpiresAt?.toISOString(),
      createdAt: request.CreatedAt.toISOString(),
      transaction: latest
        ? {
            txHash: latest.TxHash,
            status: latest.Status,
            confirmations: latest.Confirmations,
            requiredConfirmations: chain.RequiredConfirmations,
            mismatchReason: latest.MismatchReason,
            explorerUrl: this.chainService.explorerUrl(chain, latest.TxHash),
            fromAddress: latest.FromAddress,
            amountRaw: latest.AmountRaw,
            blockTimestamp: latest.BlockTimestamp?.toISOString(),
            submittedVia: latest.SubmittedVia,
            verifiedAt: latest.VerifiedAt?.toISOString(),
          }
        : undefined,
    };
  }

  private normaliseTxHash(request: PaymentRequest, input: string): string {
    const hash = (input ?? '').trim();
    const ns = request.Chain.Namespace;
    if (ns === 'eip155') {
      if (!/^0x[0-9a-fA-F]{64}$/.test(hash))
        throw new GenericError(
          'Invalid EVM transaction hash',
          HttpStatus.BAD_REQUEST,
        );
      return hash.toLowerCase();
    }
    if (ns === 'solana') {
      if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(hash))
        throw new GenericError(
          'Invalid Solana signature',
          HttpStatus.BAD_REQUEST,
        );
      return hash;
    }
    if (ns === 'bip122' || ns === 'tron') {
      if (!/^(0x)?[0-9a-fA-F]{64}$/.test(hash))
        throw new GenericError(
          'Invalid transaction id',
          HttpStatus.BAD_REQUEST,
        );
      return hash.replace(/^0x/, '').toLowerCase();
    }
    return hash;
  }
}
