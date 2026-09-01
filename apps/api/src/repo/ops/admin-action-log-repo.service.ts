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
import { AdminActionLog } from './entities/admin-action-log.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class AdminActionLogRepoService {
  private adminActionLogRepo: Repository<AdminActionLog>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.adminActionLogRepo = entityManager.getRepository(AdminActionLog);
  }

  async get(
    options: FindOneOptions<AdminActionLog>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AdminActionLogRepoService.get] finding admin action log [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.adminActionLogRepo.findOne(options);
      if (!result && panic)
        throw new GenericError(
          'AdminActionLog not found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AdminActionLogRepoService.get] error finding admin action log [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<AdminActionLog>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AdminActionLogRepoService.getAll] finding admin action logs [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.adminActionLogRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError(
          'No admin action logs found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AdminActionLogRepoService.getAll] error finding admin action logs [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<AdminActionLog>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AdminActionLogRepoService.create] saving admin action log`,
      );

      const entity = this.adminActionLogRepo.create(data);
      const result = await this.adminActionLogRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AdminActionLogRepoService.create] error saving admin action log: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<AdminActionLog>,
    partialEntity: QueryDeepPartialEntity<AdminActionLog>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[AdminActionLogRepoService.update] updating admin action log [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.adminActionLogRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[AdminActionLogRepoService.update] error updating admin action log [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<AdminActionLog>): Promise<{ error }> {
    try {
      this.logger.info(
        `[AdminActionLogRepoService.delete] deleting admin action log [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.adminActionLogRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[AdminActionLogRepoService.delete] error deleting admin action log [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(
    options: FindManyOptions<AdminActionLog>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AdminActionLogRepoService.count] counting admin action logs [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.adminActionLogRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AdminActionLogRepoService.count] error counting admin action logs [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
