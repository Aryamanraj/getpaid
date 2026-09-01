import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EntityManager, In } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { AUTH_PROVIDER_ENUM, CHAIN_NAMESPACE_ENUM } from '@recv/shared';
import { PayoutAddressRepoService } from '../repo/core/payout-address-repo.service';
import { AcceptedAssetRepoService } from '../repo/core/accepted-asset-repo.service';
import { AssetRepoService } from '../repo/core/asset-repo.service';
import { AuthIdentityRepoService } from '../repo/core/auth-identity-repo.service';
import { UserRepoService } from '../repo/core/user-repo.service';
import { PayoutAddress } from '../repo/core/entities/payout-address.entity';
import { AcceptedAsset } from '../repo/core/entities/accepted-asset.entity';
import { Asset } from '../repo/core/entities/asset.entity';
import { User } from '../repo/core/entities/user.entity';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { Promisify } from '../common/helpers/promisifier';
import { normaliseAddress } from '../common/helpers/address.helper';
import {
  AddPayoutAddressDto,
  SetAcceptedAssetDto,
} from './dto/payment-method.dto';

@Injectable()
export class PaymentMethodService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
    private payoutAddressRepo: PayoutAddressRepoService,
    private acceptedAssetRepo: AcceptedAssetRepoService,
    private assetRepo: AssetRepoService,
    private authIdentityRepo: AuthIdentityRepoService,
    private userRepo: UserRepoService,
  ) {}

  async listForUser(userId: number): Promise<ResultWithError> {
    try {
      this.logger.info(`[PaymentMethodService.listForUser] user ${userId}`);

      const addresses = await Promisify<PayoutAddress[]>(
        this.payoutAddressRepo.getAll(
          {
            where: { User: { UserID: userId }, IsActive: true },
            order: { CreatedAt: 'ASC' },
          },
          false,
        ),
      );
      const accepted = await Promisify<AcceptedAsset[]>(
        this.acceptedAssetRepo.getAll(
          {
            where: { User: { UserID: userId } },
            relations: { Asset: { Chain: true }, PayoutAddress: true },
            order: { SortOrder: 'ASC', AcceptedAssetID: 'ASC' },
          },
          false,
        ),
      );

      return {
        data: {
          payoutAddresses: (addresses ?? []).map((a) => ({
            payoutAddressId: a.PayoutAddressID,
            namespace: a.Namespace,
            address: a.Address,
            label: a.Label,
            isProven: a.IsProven,
          })),
          acceptedAssets: (accepted ?? []).map((a) => ({
            acceptedAssetId: a.AcceptedAssetID,
            assetId: a.Asset.AssetID,
            symbol: a.Asset.Symbol,
            chainId: a.Asset.Chain.ChainID,
            chainName: a.Asset.Chain.Name,
            chainSlug: a.Asset.Chain.Slug,
            payoutAddressId: a.PayoutAddress.PayoutAddressID,
            isActive: a.IsActive,
          })),
        },
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `[PaymentMethodService.listForUser] error for ${userId}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async addPayoutAddress(
    userId: number,
    dto: AddPayoutAddressDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentMethodService.addPayoutAddress] user ${userId} ${dto.namespace}`,
      );

      const address = normaliseAddress(dto.namespace, dto.address);

      const user = await Promisify<User>(
        this.userRepo.get({ where: { UserID: userId } }),
      );

      // A wallet the user has signed in with is proven; a pasted one is not.
      const proven = await Promisify<number>(
        this.authIdentityRepo.count({
          where: {
            User: { UserID: userId },
            Provider: AUTH_PROVIDER_ENUM.WALLET,
            Identifier: address,
          },
        }),
      );

      let assets: Asset[] = [];
      if (dto.assetIds?.length) {
        assets = await Promisify<Asset[]>(
          this.assetRepo.getAll(
            {
              where: { AssetID: In(dto.assetIds), IsActive: true },
              relations: { Chain: true },
            },
            false,
          ),
        );
        const wrong = (assets ?? []).find(
          (a) => a.Chain.Namespace !== dto.namespace,
        );
        if (wrong)
          throw new GenericError(
            `${wrong.Symbol} on ${wrong.Chain.Name} cannot settle to a ${dto.namespace} address`,
            HttpStatus.BAD_REQUEST,
          );
      }

      let saved: PayoutAddress;
      await this.entityManager.transaction(async (tm) => {
        const existing = await tm.findOne(PayoutAddress, {
          where: {
            User: { UserID: userId },
            Namespace: dto.namespace,
            Address: address,
          },
        });

        saved = existing
          ? await tm.save(
              Object.assign(existing, {
                IsActive: true,
                Label: dto.label ?? existing.Label,
                IsProven: proven > 0,
              }),
            )
          : await tm.save(
              tm.create(PayoutAddress, {
                User: user,
                Namespace: dto.namespace,
                Address: address,
                Label: dto.label,
                IsProven: proven > 0,
              }),
            );

        for (const asset of assets ?? []) {
          const current = await tm.findOne(AcceptedAsset, {
            where: {
              User: { UserID: userId },
              Asset: { AssetID: asset.AssetID },
            },
          });
          if (current) {
            current.PayoutAddress = saved;
            current.IsActive = true;
            await tm.save(current);
          } else {
            await tm.save(
              tm.create(AcceptedAsset, {
                User: user,
                Asset: asset,
                PayoutAddress: saved,
                IsActive: true,
              }),
            );
          }
        }
      });

      return await this.listForUser(userId);
    } catch (error) {
      this.logger.error(
        `[PaymentMethodService.addPayoutAddress] error for ${userId}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async removePayoutAddress(
    userId: number,
    payoutAddressId: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentMethodService.removePayoutAddress] user ${userId} address ${payoutAddressId}`,
      );

      const address = await Promisify<PayoutAddress>(
        this.payoutAddressRepo.get({
          where: { PayoutAddressID: payoutAddressId, User: { UserID: userId } },
        }),
      );

      // Soft-delete so existing receipts still resolve their address.
      await this.entityManager.transaction(async (tm) => {
        await tm.update(
          AcceptedAsset,
          { PayoutAddress: { PayoutAddressID: address.PayoutAddressID } },
          { IsActive: false },
        );
        await tm.update(
          PayoutAddress,
          { PayoutAddressID: address.PayoutAddressID },
          { IsActive: false },
        );
      });

      return await this.listForUser(userId);
    } catch (error) {
      this.logger.error(
        `[PaymentMethodService.removePayoutAddress] error for ${userId}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async setAcceptedAsset(
    userId: number,
    dto: SetAcceptedAssetDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentMethodService.setAcceptedAsset] user ${userId} asset ${dto.assetId}`,
      );

      const user = await Promisify<User>(
        this.userRepo.get({ where: { UserID: userId } }),
      );
      const asset = await Promisify<Asset>(
        this.assetRepo.get({
          where: { AssetID: dto.assetId, IsActive: true },
          relations: { Chain: true },
        }),
      );
      const address = await Promisify<PayoutAddress>(
        this.payoutAddressRepo.get({
          where: {
            PayoutAddressID: dto.payoutAddressId,
            User: { UserID: userId },
            IsActive: true,
          },
        }),
      );

      if (address.Namespace !== asset.Chain.Namespace)
        throw new GenericError(
          `${asset.Symbol} on ${asset.Chain.Name} cannot settle to a ${address.Namespace} address`,
          HttpStatus.BAD_REQUEST,
        );

      const existing = await Promisify<AcceptedAsset>(
        this.acceptedAssetRepo.get(
          {
            where: {
              User: { UserID: userId },
              Asset: { AssetID: asset.AssetID },
            },
            relations: { PayoutAddress: true },
          },
          false,
        ),
      );

      // SV8 — relation change goes through save(), not update().
      const row = existing ?? new AcceptedAsset();
      row.User = user;
      row.Asset = asset;
      row.PayoutAddress = address;
      row.IsActive = dto.isActive ?? true;
      await Promisify<AcceptedAsset>(this.acceptedAssetRepo.create(row));

      return await this.listForUser(userId);
    } catch (error) {
      this.logger.error(
        `[PaymentMethodService.setAcceptedAsset] error for ${userId}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /** Used by the pay page to resolve an accepted asset for a payee. */
  async resolveAcceptedAsset(
    userName: string,
    assetId: number,
  ): Promise<ResultWithError> {
    try {
      const accepted = await Promisify<AcceptedAsset>(
        this.acceptedAssetRepo.get(
          {
            where: {
              User: { UserName: userName, IsActive: true },
              Asset: { AssetID: assetId, IsActive: true },
              IsActive: true,
              PayoutAddress: { IsActive: true },
            },
            relations: {
              User: true,
              Asset: { Chain: true },
              PayoutAddress: true,
            },
          },
          false,
        ),
      );
      if (!accepted)
        throw new GenericError(
          'That user does not accept this asset',
          HttpStatus.BAD_REQUEST,
        );
      return { data: accepted, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  static namespaceOf(accepted: AcceptedAsset): CHAIN_NAMESPACE_ENUM {
    return accepted.Asset.Chain.Namespace;
  }
}
