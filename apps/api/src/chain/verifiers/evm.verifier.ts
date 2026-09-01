import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FetchRequest, Interface, JsonRpcProvider } from 'ethers';
import { NormalisedTransfer } from '@recv/shared';
import { ChainService } from '../chain.service';
import {
  ChainVerifier,
  VerifierOutcome,
  VerifyParams,
} from './verifier.interface';
import { ResultWithError } from '../../common/interfaces';
import { Promisify } from '../../common/helpers/promisifier';
import { addressesEqual } from '../../common/helpers/address.helper';

const ERC20 = new Interface([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

/**
 * One verifier for every EVM chain. Token transfers are read from Transfer
 * logs rather than calldata, so a payment routed through a smart account or
 * a router still verifies.
 */
@Injectable()
export class EvmVerifier implements ChainVerifier {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private chainService: ChainService,
  ) {}

  async verify(params: VerifyParams): Promise<ResultWithError> {
    const { chain, asset, txHash, expectedTo } = params;
    try {
      this.logger.info(`[EvmVerifier.verify] ${chain.Slug} ${txHash}`);

      const urls = await Promisify<string[]>(
        this.chainService.getRpcUrls(chain),
      );
      const timeout = await this.chainService.getTimeoutMs();

      let lastError: Error;
      for (const url of urls) {
        try {
          const req = new FetchRequest(url);
          req.timeout = timeout;
          const provider = new JsonRpcProvider(req, Number(chain.ChainRef), {
            staticNetwork: true,
          });

          const receipt = await provider.getTransactionReceipt(txHash);
          if (!receipt)
            return { data: { notFound: true } as VerifierOutcome, error: null };

          const [tx, block, latest] = await Promise.all([
            provider.getTransaction(txHash),
            provider.getBlock(receipt.blockNumber),
            provider.getBlockNumber(),
          ]);

          const confirmations = Math.max(0, latest - receipt.blockNumber + 1);
          const succeeded = receipt.status === 1;

          let transfer: NormalisedTransfer;

          if (asset.ContractAddress) {
            const topic = ERC20.getEvent('Transfer').topicHash;
            const matching = receipt.logs
              .filter(
                (log) =>
                  addressesEqual(
                    chain.Namespace,
                    log.address,
                    asset.ContractAddress,
                  ) && log.topics[0] === topic,
              )
              .map((log) =>
                ERC20.parseLog({ topics: [...log.topics], data: log.data }),
              )
              .filter((parsed) =>
                addressesEqual(chain.Namespace, parsed.args.to, expectedTo),
              );

            // Several Transfer events to the same recipient in one tx is
            // legitimate (batched payments); sum them.
            const total = matching.reduce(
              (acc, parsed) => acc + BigInt(parsed.args.value),
              0n,
            );

            transfer = {
              txHash,
              from: matching[0]?.args.from ?? tx?.from ?? '',
              to: matching.length ? expectedTo : (receipt.to ?? ''),
              contractAddress: asset.ContractAddress,
              amountRaw: total.toString(),
              blockNumber: receipt.blockNumber,
              blockTimestamp: block?.timestamp ?? 0,
              confirmations,
              succeeded,
            };
          } else {
            transfer = {
              txHash,
              from: tx?.from ?? '',
              to: tx?.to ?? '',
              amountRaw: (tx?.value ?? 0n).toString(),
              blockNumber: receipt.blockNumber,
              blockTimestamp: block?.timestamp ?? 0,
              confirmations,
              succeeded,
            };
          }

          return { data: transfer, error: null };
        } catch (error) {
          lastError = error;
          this.logger.warn(
            `[EvmVerifier.verify] ${url} failed for ${txHash}: ${error.message}`,
          );
        }
      }

      throw lastError ?? new Error('No RPC endpoint responded');
    } catch (error) {
      this.logger.error(
        `[EvmVerifier.verify] error for ${chain.Slug} ${txHash}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
