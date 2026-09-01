import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CHAIN_NAMESPACE_ENUM } from '@recv/shared';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { Chain } from '../repo/core/entities/chain.entity';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';

/**
 * Resolves per-chain endpoints from PlatformConfig. Each key holds an ordered
 * fallback list; verifiers walk it until one responds. Empty lists fall back to
 * public endpoints — enough to build against, not to depend on in production.
 */
const PUBLIC_FALLBACKS: Record<string, string[]> = {
  'eip155:1': [
    'https://ethereum-rpc.publicnode.com',
    'https://eth.llamarpc.com',
  ],
  'eip155:8453': [
    'https://mainnet.base.org',
    'https://base-rpc.publicnode.com',
  ],
  'eip155:42161': [
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum-one-rpc.publicnode.com',
  ],
  'eip155:137': [
    'https://polygon-rpc.com',
    'https://polygon-bor-rpc.publicnode.com',
  ],
  'solana:mainnet-beta': ['https://api.mainnet-beta.solana.com'],
};

@Injectable()
export class ChainService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private platformConfigService: PlatformConfigService,
  ) {}

  async getRpcUrls(chain: Chain): Promise<ResultWithError> {
    try {
      const key =
        chain.Namespace === CHAIN_NAMESPACE_ENUM.SOLANA
          ? 'chain.solana.mainnet.rpcUrls'
          : `chain.${chain.Namespace}.${chain.ChainRef}.rpcUrls`;

      const configured = await this.platformConfigService.getConfigOrDefault<
        string[]
      >(key, []);
      const urls = (configured ?? []).filter(Boolean);

      if (urls.length) return { data: urls, error: null };

      const fallback = PUBLIC_FALLBACKS[`${chain.Namespace}:${chain.ChainRef}`];
      if (!fallback)
        throw new GenericError(
          `No RPC endpoint configured for ${chain.Slug} (${key})`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );

      this.logger.warn(
        `[ChainService.getRpcUrls] ${key} is empty — using public fallback`,
      );
      return { data: fallback, error: null };
    } catch (error) {
      this.logger.error(
        `[ChainService.getRpcUrls] error for ${chain.Slug}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getTimeoutMs(): Promise<number> {
    return this.platformConfigService.getConfigOrDefault(
      'chain.rpcTimeoutMs',
      10000,
    );
  }

  explorerUrl(chain: Chain, txHash: string): string {
    return chain.ExplorerTxUrlTemplate.replace('{txHash}', txHash);
  }
}
