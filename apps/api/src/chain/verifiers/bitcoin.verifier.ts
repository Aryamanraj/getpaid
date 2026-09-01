import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import axios from 'axios';
import { NormalisedTransfer } from '@recv/shared';
import { PlatformConfigService } from '../../platform-config/platform-config.service';
import { ChainService } from '../chain.service';
import {
  ChainVerifier,
  VerifierOutcome,
  VerifyParams,
} from './verifier.interface';
import { ResultWithError } from '../../common/interfaces';

interface MempoolTx {
  txid: string;
  status: { confirmed: boolean; block_height?: number; block_time?: number };
  vin: Array<{ prevout?: { scriptpubkey_address?: string } }>;
  vout: Array<{ scriptpubkey_address?: string; value: number }>;
}

/**
 * No node — mempool.space's REST API. A single transaction can pay the same
 * address in several outputs, so every matching vout is summed.
 */
@Injectable()
export class BitcoinVerifier implements ChainVerifier {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private chainService: ChainService,
    private platformConfigService: PlatformConfigService,
  ) {}

  async verify(params: VerifyParams): Promise<ResultWithError> {
    const { txHash, expectedTo } = params;
    try {
      this.logger.info(`[BitcoinVerifier.verify] ${txHash}`);

      const base = await this.platformConfigService.getConfigOrDefault(
        'chain.bip122.apiBaseUrl',
        'https://mempool.space/api',
      );
      const timeout = await this.chainService.getTimeoutMs();

      const res = await axios.get<MempoolTx>(`${base}/tx/${txHash}`, {
        timeout,
        validateStatus: (s) => s === 200 || s === 404,
      });
      if (res.status === 404)
        return { data: { notFound: true } as VerifierOutcome, error: null };

      const tx = res.data;
      const matching = tx.vout.filter(
        (v) => v.scriptpubkey_address === expectedTo,
      );
      const amountRaw = matching
        .reduce((acc, v) => acc + BigInt(v.value), 0n)
        .toString();

      let confirmations = 0;
      if (tx.status.confirmed && tx.status.block_height) {
        const tip = await axios.get<number>(`${base}/blocks/tip/height`, {
          timeout,
        });
        confirmations = Math.max(
          0,
          Number(tip.data) - tx.status.block_height + 1,
        );
      }

      const transfer: NormalisedTransfer = {
        txHash,
        from: tx.vin[0]?.prevout?.scriptpubkey_address ?? '',
        to: matching.length ? expectedTo : '',
        amountRaw,
        blockNumber: tx.status.block_height ?? 0,
        blockTimestamp: tx.status.block_time ?? 0,
        confirmations,
        succeeded: true,
      };
      return { data: transfer, error: null };
    } catch (error) {
      this.logger.error(
        `[BitcoinVerifier.verify] error for ${txHash}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
