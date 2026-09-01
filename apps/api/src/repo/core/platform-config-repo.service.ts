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
import { PlatformConfig } from './entities/platform-config.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class PlatformConfigRepoService {
  private platformConfigRepo: Repository<PlatformConfig>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.platformConfigRepo = entityManager.getRepository(PlatformConfig);
  }

  async get(
    options: FindOneOptions<PlatformConfig>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PlatformConfigRepoService.get] finding platform config [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.platformConfigRepo.findOne(options);
      if (!result && panic)
        throw new GenericError(
          'PlatformConfig not found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PlatformConfigRepoService.get] error finding platform config [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<PlatformConfig>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PlatformConfigRepoService.getAll] finding platform configs [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.platformConfigRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError(
          'No platform configs found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PlatformConfigRepoService.getAll] error finding platform configs [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<PlatformConfig>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PlatformConfigRepoService.create] saving platform config`,
      );

      const entity = this.platformConfigRepo.create(data);
      const result = await this.platformConfigRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PlatformConfigRepoService.create] error saving platform config: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<PlatformConfig>,
    partialEntity: QueryDeepPartialEntity<PlatformConfig>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[PlatformConfigRepoService.update] updating platform config [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.platformConfigRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[PlatformConfigRepoService.update] error updating platform config [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<PlatformConfig>): Promise<{ error }> {
    try {
      this.logger.info(
        `[PlatformConfigRepoService.delete] deleting platform config [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.platformConfigRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[PlatformConfigRepoService.delete] error deleting platform config [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(
    options: FindManyOptions<PlatformConfig>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PlatformConfigRepoService.count] counting platform configs [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.platformConfigRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PlatformConfigRepoService.count] error counting platform configs [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
