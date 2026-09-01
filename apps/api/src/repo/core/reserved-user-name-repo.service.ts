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
import { ReservedUserName } from './entities/reserved-user-name.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class ReservedUserNameRepoService {
  private reservedUserNameRepo: Repository<ReservedUserName>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.reservedUserNameRepo = entityManager.getRepository(ReservedUserName);
  }

  async get(
    options: FindOneOptions<ReservedUserName>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[ReservedUserNameRepoService.get] finding reserved username [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.reservedUserNameRepo.findOne(options);
      if (!result && panic)
        throw new GenericError(
          'ReservedUserName not found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[ReservedUserNameRepoService.get] error finding reserved username [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<ReservedUserName>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[ReservedUserNameRepoService.getAll] finding reserved usernames [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.reservedUserNameRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError(
          'No reserved usernames found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[ReservedUserNameRepoService.getAll] error finding reserved usernames [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<ReservedUserName>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[ReservedUserNameRepoService.create] saving reserved username`,
      );

      const entity = this.reservedUserNameRepo.create(data);
      const result = await this.reservedUserNameRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[ReservedUserNameRepoService.create] error saving reserved username: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<ReservedUserName>,
    partialEntity: QueryDeepPartialEntity<ReservedUserName>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[ReservedUserNameRepoService.update] updating reserved username [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.reservedUserNameRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[ReservedUserNameRepoService.update] error updating reserved username [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(
    criteria: FindOptionsWhere<ReservedUserName>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[ReservedUserNameRepoService.delete] deleting reserved username [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.reservedUserNameRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[ReservedUserNameRepoService.delete] error deleting reserved username [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(
    options: FindManyOptions<ReservedUserName>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[ReservedUserNameRepoService.count] counting reserved usernames [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.reservedUserNameRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[ReservedUserNameRepoService.count] error counting reserved usernames [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
