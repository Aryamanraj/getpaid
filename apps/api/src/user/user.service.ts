import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FindOptionsWhere, Not, IsNull } from 'typeorm';
import {
  MeResponse,
  PublicProfile,
  checkUserNameShape,
  normaliseUserName,
} from '@recv/shared';
import { UserRepoService } from '../repo/core/user-repo.service';
import { ReservedUserNameRepoService } from '../repo/core/reserved-user-name-repo.service';
import { AuthIdentityRepoService } from '../repo/core/auth-identity-repo.service';
import { AcceptedAssetRepoService } from '../repo/core/accepted-asset-repo.service';
import { DomainRepoService } from '../repo/core/domain-repo.service';
import { User } from '../repo/core/entities/user.entity';
import { ReservedUserName } from '../repo/core/entities/reserved-user-name.entity';
import { AuthIdentity } from '../repo/core/entities/auth-identity.entity';
import { AcceptedAsset } from '../repo/core/entities/accepted-asset.entity';
import { Domain } from '../repo/core/entities/domain.entity';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { DomainService } from '../domain/domain.service';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { Promisify } from '../common/helpers/promisifier';
import { UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private userRepo: UserRepoService,
    private reservedUserNameRepo: ReservedUserNameRepoService,
    private authIdentityRepo: AuthIdentityRepoService,
    private acceptedAssetRepo: AcceptedAssetRepoService,
    private domainRepo: DomainRepoService,
    private platformConfigService: PlatformConfigService,
    private domainService: DomainService,
  ) {}

  async checkUserName(input: string, host: string): Promise<ResultWithError> {
    try {
      const name = normaliseUserName(input);
      this.logger.info(`[UserService.checkUserName] name: ${name} @ ${host}`);

      const domain = await Promisify<Domain>(
        this.domainService.getByHost(host),
      );
      return await this.availability(name, domain.DomainID);
    } catch (error) {
      this.logger.error(
        `[UserService.checkUserName] error for ${input}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /** Names are scoped per domain — each product has its own namespace. */
  private async availability(
    name: string,
    domainId: number,
  ): Promise<ResultWithError> {
    try {
      const minLength = await this.platformConfigService.getConfigOrDefault(
        'username.minLength',
        3,
      );
      const maxLength = await this.platformConfigService.getConfigOrDefault(
        'username.maxLength',
        30,
      );

      const shape = checkUserNameShape(name, { minLength, maxLength });
      if (!shape.valid)
        return {
          data: { available: false, reason: shape.reason },
          error: null,
        };

      const reserved = await Promisify<ReservedUserName>(
        this.reservedUserNameRepo.get({ where: { Name: name } }, false),
      );
      const extra = await this.platformConfigService.getConfigOrDefault<
        string[]
      >('username.extraReserved', []);
      if (reserved || extra.includes(name))
        return {
          data: { available: false, reason: 'That name is reserved' },
          error: null,
        };

      const taken = await Promisify<number>(
        this.userRepo.count({ where: { UserName: name, DomainID: domainId } }),
      );
      if (taken > 0)
        return {
          data: { available: false, reason: 'That name is taken' },
          error: null,
        };

      return { data: { available: true }, error: null };
    } catch (error) {
      this.logger.error(
        `[UserService.availability] error for ${name}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async claimUserName(userId: number, input: string): Promise<ResultWithError> {
    try {
      const name = normaliseUserName(input);
      this.logger.info(`[UserService.claimUserName] user ${userId} → ${name}`);

      const signupsOpen = await this.platformConfigService.getConfigOrDefault(
        'feature.signupsOpen',
        true,
      );
      if (!signupsOpen)
        throw new GenericError(
          'Username claims are paused right now',
          HttpStatus.SERVICE_UNAVAILABLE,
        );

      const user = await Promisify<User>(
        this.userRepo.get({ where: { UserID: userId } }),
      );
      if (user.UserName)
        throw new GenericError(
          `You already have a username: ${user.UserName}`,
          HttpStatus.CONFLICT,
        );

      const check = await Promisify<{ available: boolean; reason?: string }>(
        this.availability(name, user.DomainID),
      );
      if (!check.available)
        throw new GenericError(check.reason, HttpStatus.CONFLICT);

      // UQ_Users_UserName is the real arbiter under concurrency.
      const { error } = await this.userRepo.update(
        { UserID: userId, UserName: IsNull() },
        { UserName: name },
      );
      if (error) {
        if (error?.code === '23505')
          throw new GenericError(
            'That name was just taken',
            HttpStatus.CONFLICT,
          );
        throw error;
      }

      return { data: { userName: name }, error: null };
    } catch (error) {
      this.logger.error(
        `[UserService.claimUserName] error for ${userId}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getMe(userId: number): Promise<ResultWithError> {
    try {
      this.logger.info(`[UserService.getMe] user ${userId}`);

      const user = await Promisify<User>(
        this.userRepo.get({ where: { UserID: userId } }),
      );
      const identities = await Promisify<AuthIdentity[]>(
        this.authIdentityRepo.getAll(
          { where: { User: { UserID: userId } }, order: { CreatedAt: 'ASC' } },
          false,
        ),
      );

      const me: MeResponse = {
        userId: user.UserID,
        userName: user.UserName,
        displayName: user.DisplayName,
        bio: user.Bio,
        avatarUrl: user.AvatarUrl,
        accentHue: user.AccentHue ?? undefined,
        presetAmounts: user.PresetAmounts ?? undefined,
        domainId: user.DomainID,
        identities: (identities ?? []).map((i) => ({
          authIdentityId: i.AuthIdentityID,
          provider: i.Provider,
          identifier: i.Identifier,
          namespace: i.Namespace,
          isPrimary: i.IsPrimary,
          verifiedAt: i.VerifiedAt?.toISOString(),
        })),
        createdAt: user.CreatedAt.toISOString(),
      };
      return { data: me, error: null };
    } catch (error) {
      this.logger.error(
        `[UserService.getMe] error for ${userId}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`[UserService.updateProfile] user ${userId}`);

      const user = await Promisify<User>(
        this.userRepo.get({ where: { UserID: userId } }),
      );

      if (dto.displayName !== undefined) user.DisplayName = dto.displayName;
      if (dto.bio !== undefined) user.Bio = dto.bio;
      if (dto.avatarUrl !== undefined) user.AvatarUrl = dto.avatarUrl;
      if (dto.accentHue !== undefined) user.AccentHue = dto.accentHue;
      if (dto.presetAmounts !== undefined)
        user.PresetAmounts = dto.presetAmounts;

      const saved = await Promisify<User>(this.userRepo.create(user));
      return await this.getMe(saved.UserID);
    } catch (error) {
      this.logger.error(
        `[UserService.updateProfile] error for ${userId}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /** The pay page. Public, so it exposes only what a payer needs. */
  async getPublicProfile(
    input: string,
    host: string,
  ): Promise<ResultWithError> {
    try {
      const name = normaliseUserName(input);
      this.logger.info(
        `[UserService.getPublicProfile] name: ${name} @ ${host}`,
      );

      const domain = await Promisify<Domain>(
        this.domainService.getByHost(host),
      );
      const where: FindOptionsWhere<User> = {
        UserName: name,
        DomainID: domain.DomainID,
        IsActive: true,
      };
      const user = await Promisify<User>(this.userRepo.get({ where }, false));
      if (!user) throw new GenericError('No such user', HttpStatus.NOT_FOUND);

      const accepted = await Promisify<AcceptedAsset[]>(
        this.acceptedAssetRepo.getAll(
          {
            where: {
              User: { UserID: user.UserID },
              IsActive: true,
              Asset: { IsActive: true, Chain: { IsActive: true } },
              PayoutAddress: { IsActive: true },
            },
            relations: { Asset: { Chain: true }, PayoutAddress: true },
            order: { SortOrder: 'ASC', AcceptedAssetID: 'ASC' },
          },
          false,
        ),
      );

      const profile: PublicProfile = {
        userName: user.UserName,
        displayName: user.DisplayName,
        bio: user.Bio,
        avatarUrl: user.AvatarUrl,
        accentHue: user.AccentHue ?? undefined,
        presetAmounts: user.PresetAmounts ?? undefined,
        acceptedAssets: (accepted ?? []).map((a) => ({
          acceptedAssetId: a.AcceptedAssetID,
          asset: {
            assetId: a.Asset.AssetID,
            chainId: a.Asset.Chain.ChainID,
            symbol: a.Asset.Symbol,
            name: a.Asset.Name,
            contractAddress: a.Asset.ContractAddress,
            decimals: a.Asset.Decimals,
            logoUrl: a.Asset.LogoUrl,
            isStablecoin: a.Asset.IsStablecoin,
          },
          chain: {
            chainId: a.Asset.Chain.ChainID,
            namespace: a.Asset.Chain.Namespace,
            chainRef: a.Asset.Chain.ChainRef,
            name: a.Asset.Chain.Name,
            slug: a.Asset.Chain.Slug,
            nativeSymbol: a.Asset.Chain.NativeSymbol,
            nativeDecimals: a.Asset.Chain.NativeDecimals,
            explorerTxUrlTemplate: a.Asset.Chain.ExplorerTxUrlTemplate,
          },
          toAddress: a.PayoutAddress.Address,
          isProven: a.PayoutAddress.IsProven,
        })),
      };
      return { data: profile, error: null };
    } catch (error) {
      this.logger.error(
        `[UserService.getPublicProfile] error for ${input}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async userHasName(userId: number): Promise<ResultWithError> {
    try {
      const count = await Promisify<number>(
        this.userRepo.count({
          where: { UserID: userId, UserName: Not(IsNull()) },
        }),
      );
      return { data: count > 0, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}
