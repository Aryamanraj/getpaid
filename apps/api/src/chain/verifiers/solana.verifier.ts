import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Connection, PublicKey } from '@solana/web3.js';
import { NormalisedTransfer } from '@recv/shared';
import { ChainService } from '../chain.service';
import {
  ChainVerifier,
  VerifierOutcome,
  VerifyParams,
} from './verifier.interface';
import { ResultWithError } from '../../common/interfaces';
import { Promisify } from '../../common/helpers/promisifier';

/**
 * SPL amounts come from pre/post token balance deltas rather than instruction
 * parsing — that survives transfers made through any program. Native SOL uses
 * the account balance delta the same way.
 */
@Injectable()
export class SolanaVerifier implements ChainVerifier {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private chainService: ChainService,
  ) {}

  async verify(params: VerifyParams): Promise<ResultWithError> {
    const { chain, asset, txHash, expectedTo } = params;
    try {
      this.logger.info(`[SolanaVerifier.verify] ${txHash}`);

      const urls = await Promisify<string[]>(
        this.chainService.getRpcUrls(chain),
      );
      const timeout = await this.chainService.getTimeoutMs();

      let lastError: Error;
      for (const url of urls) {
        try {
          const connection = new Connection(url, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: timeout,
          });

          const tx = await connection.getTransaction(txHash, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });
          if (!tx)
            return { data: { notFound: true } as VerifierOutcome, error: null };

          const keys = tx.transaction.message.getAccountKeys({
            accountKeysFromLookups: tx.meta?.loadedAddresses,
          });
          const staticKeys = keys.staticAccountKeys.map((k) => k.toBase58());
          const from = staticKeys[0] ?? '';
          const succeeded = tx.meta?.err === null || tx.meta?.err === undefined;

          const statuses = await connection.getSignatureStatuses([txHash], {
            searchTransactionHistory: true,
          });
          const status = statuses.value[0];
          // Finalized is the only meaningful threshold on Solana; expose it as
          // "1 confirmation" so Chain.RequiredConfirmations = 1 means finalized.
          const confirmations =
            status?.confirmationStatus === 'finalized'
              ? 1
              : status?.confirmationStatus === 'confirmed'
                ? 0
                : 0;

          let amountRaw = '0';
          let to = '';

          if (asset.ContractAddress) {
            const mint = asset.ContractAddress;
            const owner = expectedTo;
            const pre = (tx.meta?.preTokenBalances ?? []).filter(
              (b) => b.mint === mint && b.owner === owner,
            );
            const post = (tx.meta?.postTokenBalances ?? []).filter(
              (b) => b.mint === mint && b.owner === owner,
            );
            const sum = (list: typeof pre) =>
              list.reduce((acc, b) => acc + BigInt(b.uiTokenAmount.amount), 0n);
            const delta = sum(post) - sum(pre);
            amountRaw = (delta > 0n ? delta : 0n).toString();
            to = delta > 0n ? owner : '';
          } else {
            const idx = keys.staticAccountKeys.findIndex((k) =>
              k.equals(new PublicKey(expectedTo)),
            );
            if (idx >= 0 && tx.meta) {
              const delta =
                BigInt(tx.meta.postBalances[idx]) -
                BigInt(tx.meta.preBalances[idx]);
              amountRaw = (delta > 0n ? delta : 0n).toString();
              to = delta > 0n ? expectedTo : '';
            }
          }

          const transfer: NormalisedTransfer = {
            txHash,
            from,
            to,
            contractAddress: asset.ContractAddress,
            amountRaw,
            blockNumber: tx.slot,
            blockTimestamp: tx.blockTime ?? 0,
            confirmations,
            succeeded,
          };
          return { data: transfer, error: null };
        } catch (error) {
          lastError = error;
          this.logger.warn(
            `[SolanaVerifier.verify] ${url} failed for ${txHash}: ${error.message}`,
          );
        }
      }

      throw lastError ?? new Error('No RPC endpoint responded');
    } catch (error) {
      this.logger.error(
        `[SolanaVerifier.verify] error for ${txHash}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
