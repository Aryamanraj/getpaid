import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { DomainRepoService } from '../repo/core/domain-repo.service';
import { ChainRepoService } from '../repo/core/chain-repo.service';
import { AssetRepoService } from '../repo/core/asset-repo.service';
import { UserRepoService } from '../repo/core/user-repo.service';
import { VerificationJobRepoService } from '../repo/ops/verification-job-repo.service';
import { AdminActionLogRepoService } from '../repo/ops/admin-action-log-repo.service';
import { Domain } from '../repo/core/entities/domain.entity';
import { Chain } from '../repo/core/entities/chain.entity';
import { Asset } from '../repo/core/entities/asset.entity';
import { VerificationJob } from '../repo/ops/entities/verification-job.entity';
import { DomainService } from '../domain/domain.service';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { Promisify } from '../common/helpers/promisifier';
import { redactSensitive } from '../common/helpers/redact.helper';
import { UpsertDomainDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private domainRepo: DomainRepoService,
    private chainRepo: ChainRepoService,
    private assetRepo: AssetRepoService,
    private userRepo: UserRepoService,
    private verificationJobRepo: VerificationJobRepoService,
    private adminActionLogRepo: AdminActionLogRepoService,
    private domainService: DomainService,
  ) {}

  async listDomains(): Promise<ResultWithError> {
    try {
      const rows = await Promisify<Domain[]>(
        this.domainRepo.getAll(
          { relations: { AliasOfDomain: true }, order: { SortOrder: 'ASC' } },
          false,
        ),
      );
      return { data: rows ?? [], error: null };
    } catch (error) {
      this.logger.error(`[AdminService.listDomains] error: ${error.stack}`);
      return { data: null, error };
    }
  }

  async upsertDomain(
    dto: UpsertDomainDto,
    ip?: string,
  ): Promise<ResultWithError> {
    try {
      const host = dto.host.trim().toLowerCase();
      this.logger.info(`[AdminService.upsertDomain] ${host}`);

      const existing = await Promisify<Domain>(
        this.domainRepo.get({ where: { Host: host } }, false),
      );
      const domain = existing ?? new Domain();

      domain.Host = host;
      domain.BrandName = dto.brandName;
      if (dto.tagline !== undefined) domain.Tagline = dto.tagline;
      if (dto.logoUrl !== undefined) domain.LogoUrl = dto.logoUrl;
      if (dto.faviconUrl !== undefined) domain.FaviconUrl = dto.faviconUrl;
      if (dto.themeConfig !== undefined) domain.ThemeConfig = dto.themeConfig;
      if (dto.supportEmail !== undefined)
        domain.SupportEmail = dto.supportEmail;
      if (dto.mailFromAddress !== undefined)
        domain.MailFromAddress = dto.mailFromAddress;
      if (dto.socialLinks !== undefined) domain.SocialLinks = dto.socialLinks;
      if (dto.isActive !== undefined) domain.IsActive = dto.isActive;
      if (dto.isDefault !== undefined) domain.IsDefault = dto.isDefault;
      if (dto.aliasOfDomainId !== undefined) {
        domain.AliasOfDomain = dto.aliasOfDomainId
          ? await Promisify<Domain>(
              this.domainRepo.get({ where: { DomainID: dto.aliasOfDomainId } }),
            )
          : null;
      }
      if (!existing) domain.ThemeConfig = domain.ThemeConfig ?? {};

      const saved = await Promisify<Domain>(this.domainRepo.create(domain));

      if (saved.IsDefault) {
        await this.domainRepo.update({ IsDefault: true }, { IsDefault: false });
        await this.domainRepo.update(
          { DomainID: saved.DomainID },
          { IsDefault: true },
        );
      }

      await this.domainService.invalidateBootstrap();
      await this.log('upsert', 'Domain', host, dto, ip);

      return { data: saved, error: null };
    } catch (error) {
      this.logger.error(`[AdminService.upsertDomain] error: ${error.stack}`);
      return { data: null, error };
    }
  }

  async listRegistry(): Promise<ResultWithError> {
    try {
      const chains = await Promisify<Chain[]>(
        this.chainRepo.getAll({ order: { SortOrder: 'ASC' } }, false),
      );
      const assets = await Promisify<Asset[]>(
        this.assetRepo.getAll(
          { relations: { Chain: true }, order: { SortOrder: 'ASC' } },
          false,
        ),
      );
      return {
        data: { chains: chains ?? [], assets: assets ?? [] },
        error: null,
      };
    } catch (error) {
      this.logger.error(`[AdminService.listRegistry] error: ${error.stack}`);
      return { data: null, error };
    }
  }

  async setChainActive(
    id: number,
    isActive: boolean,
    ip?: string,
  ): Promise<ResultWithError> {
    try {
      const { error } = await this.chainRepo.update(
        { ChainID: id },
        { IsActive: isActive },
      );
      if (error) throw error;
      await this.domainService.invalidateBootstrap();
      await this.log('setActive', 'Chain', String(id), { isActive }, ip);
      return { data: true, error: null };
    } catch (error) {
      this.logger.error(`[AdminService.setChainActive] error: ${error.stack}`);
      return { data: null, error };
    }
  }

  async setAssetActive(
    id: number,
    isActive: boolean,
    ip?: string,
  ): Promise<ResultWithError> {
    try {
      const { error } = await this.assetRepo.update(
        { AssetID: id },
        { IsActive: isActive },
      );
      if (error) throw error;
      await this.domainService.invalidateBootstrap();
      await this.log('setActive', 'Asset', String(id), { isActive }, ip);
      return { data: true, error: null };
    } catch (error) {
      this.logger.error(`[AdminService.setAssetActive] error: ${error.stack}`);
      return { data: null, error };
    }
  }

  async setUserActive(
    id: number,
    isActive: boolean,
    ip?: string,
  ): Promise<ResultWithError> {
    try {
      const { error } = await this.userRepo.update(
        { UserID: id },
        { IsActive: isActive },
      );
      if (error) throw error;
      await this.log('setActive', 'User', String(id), { isActive }, ip);
      return { data: true, error: null };
    } catch (error) {
      this.logger.error(`[AdminService.setUserActive] error: ${error.stack}`);
      return { data: null, error };
    }
  }

  async listVerificationJobs(limit = 50): Promise<ResultWithError> {
    try {
      const rows = await Promisify<VerificationJob[]>(
        this.verificationJobRepo.getAll(
          {
            relations: {
              PaymentTransaction: { PaymentRequest: true, Chain: true },
            },
            order: { UpdatedAt: 'DESC' },
            take: Math.min(limit, 200),
          },
          false,
        ),
      );
      return { data: rows ?? [], error: null };
    } catch (error) {
      this.logger.error(
        `[AdminService.listVerificationJobs] error: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async requeueVerificationJob(
    id: number,
    ip?: string,
  ): Promise<ResultWithError> {
    try {
      const job = await Promisify<VerificationJob>(
        this.verificationJobRepo.get({ where: { VerificationJobID: id } }),
      );
      if (job.Status === 'succeeded')
        throw new GenericError('Job already succeeded', HttpStatus.CONFLICT);
      const { error } = await this.verificationJobRepo.update(
        { VerificationJobID: id },
        {
          Status: 'queued' as never,
          NextRunAt: new Date(),
          AttemptCount: 0,
          LastError: null,
        },
      );
      if (error) throw error;
      await this.log('requeue', 'VerificationJob', String(id), {}, ip);
      return { data: true, error: null };
    } catch (error) {
      this.logger.error(
        `[AdminService.requeueVerificationJob] error: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  private async log(
    action: string,
    entityName: string,
    entityRef: string,
    payload: unknown,
    ip?: string,
  ) {
    await this.adminActionLogRepo.create({
      Action: action,
      EntityName: entityName,
      EntityRef: entityRef,
      Payload: redactSensitive(payload) as Record<string, unknown>,
      Ip: ip,
    });
  }
}
