import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import axios from 'axios';
import bs58 from 'bs58';
import * as crypto from 'node:crypto';
import { NormalisedTransfer } from '@recv/shared';
import { PlatformConfigService } from '../../platform-config/platform-config.service';
import { ChainService } from '../chain.service';
import {
  ChainVerifier,
  VerifierOutcome,
  VerifyParams,
} from './verifier.interface';
import { ResultWithError } from '../../common/interfaces';

const TRANSFER_TOPIC =
  'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/**
 * TRX from the raw contract; TRC-20 from the Transfer event log. TronGrid
 * returns addresses in hex (41…) — converted to base58 for comparison.
 */
@Injectable()
export class TronVerifier implements ChainVerifier {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private chainService: ChainService,
    private platformConfigService: PlatformConfigService,
  ) {}

  async verify(params: VerifyParams): Promise<ResultWithError> {
    const { asset, txHash, expectedTo } = params;
    try {
      this.logger.info(`[TronVerifier.verify] ${txHash}`);

      const base = await this.platformConfigService.getConfigOrDefault(
        'chain.tron.apiBaseUrl',
        'https://api.trongrid.io',
      );
      const apiKey =
        await this.platformConfigService.getConfigOrDefault<string>(
          'chain.tron.apiKey',
          '',
        );
      const timeout = await this.chainService.getTimeoutMs();
      const headers = apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {};

      const info = await axios.post(
        `${base}/wallet/gettransactioninfobyid`,
        { value: txHash },
        { timeout, headers },
      );
      if (!info.data?.id)
        return { data: { notFound: true } as VerifierOutcome, error: null };

      const succeeded =
        info.data.receipt?.result === undefined ||
        info.data.receipt?.result === 'SUCCESS';

      const tx = await axios.post(
        `${base}/wallet/gettransactionbyid`,
        { value: txHash },
        { timeout, headers },
      );
      const contract = tx.data?.raw_data?.contract?.[0];
      const value = contract?.parameter?.value ?? {};
      const from = this.hexToBase58(value.owner_address);

      let amountRaw = '0';
      let to = '';

      if (asset.ContractAddress) {
        const logs: Array<{ address: string; topics: string[]; data: string }> =
          info.data.log ?? [];
        for (const log of logs) {
          const logContract = this.hexToBase58(`41${log.address}`);
          if (logContract !== asset.ContractAddress) continue;
          if (log.topics?.[0] !== TRANSFER_TOPIC) continue;
          const recipient = this.hexToBase58(`41${log.topics[2].slice(-40)}`);
          if (recipient !== expectedTo) continue;
          amountRaw = (BigInt(amountRaw) + BigInt(`0x${log.data}`)).toString();
          to = expectedTo;
        }
      } else if (contract?.type === 'TransferContract') {
        const recipient = this.hexToBase58(value.to_address);
        if (recipient === expectedTo) {
          amountRaw = String(value.amount ?? 0);
          to = expectedTo;
        }
      }

      const nowBlock = await axios.post(
        `${base}/wallet/getnowblock`,
        {},
        { timeout, headers },
      );
      const tip = nowBlock.data?.block_header?.raw_data?.number ?? 0;
      const blockNumber = info.data.blockNumber ?? 0;
      const confirmations = blockNumber
        ? Math.max(0, tip - blockNumber + 1)
        : 0;

      const transfer: NormalisedTransfer = {
        txHash,
        from,
        to,
        contractAddress: asset.ContractAddress,
        amountRaw,
        blockNumber,
        blockTimestamp: Math.floor((info.data.blockTimeStamp ?? 0) / 1000),
        confirmations,
        succeeded,
      };
      return { data: transfer, error: null };
    } catch (error) {
      this.logger.error(
        `[TronVerifier.verify] error for ${txHash}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  private hexToBase58(hex: string): string {
    if (!hex) return '';
    const bytes = Buffer.from(hex, 'hex');
    const h1 = crypto.createHash('sha256').update(bytes).digest();
    const h2 = crypto.createHash('sha256').update(h1).digest();
    return bs58.encode(Buffer.concat([bytes, h2.subarray(0, 4)]));
  }
}
