import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
  BootstrapAsset,
  BootstrapChain,
  BootstrapDomain,
  BootstrapPayload,
} from '@recv/shared';
import { DomainRepoService } from '../repo/core/domain-repo.service';
import { ChainRepoService } from '../repo/core/chain-repo.service';
import { AssetRepoService } from '../repo/core/asset-repo.service';
import { Domain } from '../repo/core/entities/domain.entity';
import { Chain } from '../repo/core/entities/chain.entity';
import { Asset } from '../repo/core/entities/asset.entity';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { CacheService } from '../cache/cache.service';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { Promisify } from '../common/helpers/promisifier';
import { CacheKeys } from '../common/constants';

const FEATURE_PREFIX = 'feature.';

/**
 * Resolves a Host header to everything the web app needs to render itself.
 * The middleware does pure string work and never calls the network; this
 * endpoint is the authority on which domains actually exist.
 *
 * See docs/ARCHITECTURE.md §4.
 */
@Injectable()
export class DomainService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private domainRepo: DomainRepoService,
    private chainRepo: ChainRepoService,
    private assetRepo: AssetRepoService,
    private platformConfigService: PlatformConfigService,
    private cacheService: CacheService,
  ) {}

  async getByHost(host: string): Promise<ResultWithError> {
    try {
      this.logger.info(`[DomainService.getByHost] host: ${host}`);

      const normalised = this.normaliseHost(host);
      if (!normalised)
        throw new GenericError('Host is required', HttpStatus.BAD_REQUEST);

      const domain = await Promisify<Domain>(
        this.domainRepo.get(
          {
            where: { Host: normalised, IsActive: true },
            relations: { AliasOfDomain: true },
          },
          false,
        ),
      );

      if (!domain)
        throw new GenericError(
          `Unknown host: ${normalised}`,
          HttpStatus.NOT_FOUND,
        );

      return { data: domain, error: null };
    } catch (error) {
      this.logger.error(
        `[DomainService.getByHost] error resolving ${host}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getBootstrap(host: string): Promise<ResultWithError> {
    try {
      this.logger.info(`[DomainService.getBootstrap] host: ${host}`);

      const normalised = this.normaliseHost(host);
      const cacheKey = CacheKeys.bootstrap(normalised);

      const cached = await Promisify<BootstrapPayload>(
        this.cacheService.get<BootstrapPayload>(cacheKey),
      );
      if (cached) return { data: cached, error: null };

      const domain = await Promisify<Domain>(this.getByHost(normalised));

      // An alias domain renders its target's identity rather than its own.
      const effective = domain.AliasOfDomain
        ? await Promisify<Domain>(
            this.domainRepo.get({
              where: { DomainID: domain.AliasOfDomain.DomainID },
            }),
          )
        : domain;

      const publicConfig = await Promisify<Record<string, unknown>>(
        this.platformConfigService.getPublicConfig(),
      );

      const chains = await Promisify<Chain[]>(
        this.chainRepo.getAll(
          { where: { IsActive: true }, order: { SortOrder: 'ASC' } },
          false,
        ),
      );

      const assets = await Promisify<Asset[]>(
        this.assetRepo.getAll(
          {
            where: { IsActive: true },
            relations: { Chain: true },
            order: { SortOrder: 'ASC' },
          },
          false,
        ),
      );

      const features: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(publicConfig ?? {})) {
        if (key.startsWith(FEATURE_PREFIX)) {
          features[key.slice(FEATURE_PREFIX.length)] = Boolean(value);
        }
      }

      const payload: BootstrapPayload = {
        domain: this.toBootstrapDomain(effective),
        features,
        publicConfig: publicConfig ?? {},
        chains: (chains ?? []).map((c) => this.toBootstrapChain(c)),
        assets: (assets ?? []).map((a) => this.toBootstrapAsset(a)),
      };

      const ttl = await this.platformConfigService.getConfigOrDefault<number>(
        'web.bootstrapCacheTtlSeconds',
        300,
      );
      await Promisify<boolean>(this.cacheService.set(cacheKey, payload, ttl));

      return { data: payload, error: null };
    } catch (error) {
      this.logger.error(
        `[DomainService.getBootstrap] error for ${host}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async invalidateBootstrap(): Promise<ResultWithError> {
    try {
      await Promisify<number>(this.cacheService.delByPrefix('bootstrap:'));
      return { data: true, error: null };
    } catch (error) {
      this.logger.error(
        `[DomainService.invalidateBootstrap] error: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  private normaliseHost(host: string): string {
    return (host ?? '').trim().toLowerCase().split(':')[0];
  }

  private toBootstrapDomain(domain: Domain): BootstrapDomain {
    return {
      host: domain.Host,
      brandName: domain.BrandName,
      tagline: domain.Tagline,
      logoUrl: domain.LogoUrl,
      faviconUrl: domain.FaviconUrl,
      supportEmail: domain.SupportEmail,
      theme: domain.ThemeConfig ?? {},
      socialLinks: domain.SocialLinks,
    };
  }

  private toBootstrapChain(chain: Chain): BootstrapChain {
    return {
      chainId: chain.ChainID,
      namespace: chain.Namespace,
      chainRef: chain.ChainRef,
      name: chain.Name,
      slug: chain.Slug,
      nativeSymbol: chain.NativeSymbol,
      nativeDecimals: chain.NativeDecimals,
      explorerTxUrlTemplate: chain.ExplorerTxUrlTemplate,
    };
  }

  private toBootstrapAsset(asset: Asset): BootstrapAsset {
    return {
      assetId: asset.AssetID,
      chainId: asset.Chain?.ChainID,
      symbol: asset.Symbol,
      name: asset.Name,
      contractAddress: asset.ContractAddress,
      decimals: asset.Decimals,
      logoUrl: asset.LogoUrl,
      isStablecoin: asset.IsStablecoin,
    };
  }
}
