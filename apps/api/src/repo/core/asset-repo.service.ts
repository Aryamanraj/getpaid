import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  DeepPartial,
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Asset } from './entities/asset.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class AssetRepoService {
  private assetRepo: Repository<Asset>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.assetRepo = entityManager.getRepository(Asset);
  }

  async get(
    options: FindOneOptions<Asset>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AssetRepoService.get] finding asset [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.assetRepo.findOne(options);
      if (!result && panic)
        throw new GenericError('Asset not found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AssetRepoService.get] error finding asset [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Asset>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AssetRepoService.getAll] finding assets [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.assetRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError('No assets found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AssetRepoService.getAll] error finding assets [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<Asset>): Promise<ResultWithError> {
    try {
      this.logger.info(`[AssetRepoService.create] saving asset`);

      const entity = this.assetRepo.create(data);
      const result = await this.assetRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AssetRepoService.create] error saving asset: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<Asset>,
    partialEntity: QueryDeepPartialEntity<Asset>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[AssetRepoService.update] updating asset [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.assetRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[AssetRepoService.update] error updating asset [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<Asset>): Promise<{ error }> {
    try {
      this.logger.info(
        `[AssetRepoService.delete] deleting asset [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.assetRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[AssetRepoService.delete] error deleting asset [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(options: FindManyOptions<Asset>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AssetRepoService.count] counting assets [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.assetRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AssetRepoService.count] error counting assets [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
