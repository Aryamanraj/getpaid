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
import { Domain } from './entities/domain.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class DomainRepoService {
  private domainRepo: Repository<Domain>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.domainRepo = entityManager.getRepository(Domain);
  }

  async get(
    options: FindOneOptions<Domain>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[DomainRepoService.get] finding domain [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.domainRepo.findOne(options);
      if (!result && panic)
        throw new GenericError('Domain not found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[DomainRepoService.get] error finding domain [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Domain>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[DomainRepoService.getAll] finding domains [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.domainRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError('No domains found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[DomainRepoService.getAll] error finding domains [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<Domain>): Promise<ResultWithError> {
    try {
      this.logger.info(`[DomainRepoService.create] saving domain`);

      const entity = this.domainRepo.create(data);
      const result = await this.domainRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[DomainRepoService.create] error saving domain: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<Domain>,
    partialEntity: QueryDeepPartialEntity<Domain>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[DomainRepoService.update] updating domain [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.domainRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[DomainRepoService.update] error updating domain [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<Domain>): Promise<{ error }> {
    try {
      this.logger.info(
        `[DomainRepoService.delete] deleting domain [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.domainRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[DomainRepoService.delete] error deleting domain [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(options: FindManyOptions<Domain>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[DomainRepoService.count] counting domains [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.domainRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[DomainRepoService.count] error counting domains [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
