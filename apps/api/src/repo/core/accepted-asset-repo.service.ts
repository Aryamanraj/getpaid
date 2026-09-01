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
import { AcceptedAsset } from './entities/accepted-asset.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class AcceptedAssetRepoService {
  private acceptedAssetRepo: Repository<AcceptedAsset>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.acceptedAssetRepo = entityManager.getRepository(AcceptedAsset);
  }

  async get(
    options: FindOneOptions<AcceptedAsset>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AcceptedAssetRepoService.get] finding accepted asset [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.acceptedAssetRepo.findOne(options);
      if (!result && panic)
        throw new GenericError('AcceptedAsset not found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AcceptedAssetRepoService.get] error finding accepted asset [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<AcceptedAsset>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AcceptedAssetRepoService.getAll] finding accepted assets [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.acceptedAssetRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError(
          'No accepted assets found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AcceptedAssetRepoService.getAll] error finding accepted assets [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<AcceptedAsset>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AcceptedAssetRepoService.create] saving accepted asset`,
      );

      const entity = this.acceptedAssetRepo.create(data);
      const result = await this.acceptedAssetRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AcceptedAssetRepoService.create] error saving accepted asset: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<AcceptedAsset>,
    partialEntity: QueryDeepPartialEntity<AcceptedAsset>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[AcceptedAssetRepoService.update] updating accepted asset [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.acceptedAssetRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[AcceptedAssetRepoService.update] error updating accepted asset [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<AcceptedAsset>): Promise<{ error }> {
    try {
      this.logger.info(
        `[AcceptedAssetRepoService.delete] deleting accepted asset [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.acceptedAssetRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[AcceptedAssetRepoService.delete] error deleting accepted asset [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(
    options: FindManyOptions<AcceptedAsset>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AcceptedAssetRepoService.count] counting accepted assets [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.acceptedAssetRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AcceptedAssetRepoService.count] error counting accepted assets [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
