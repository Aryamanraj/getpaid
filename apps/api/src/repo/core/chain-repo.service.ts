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
import { Chain } from './entities/chain.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class ChainRepoService {
  private chainRepo: Repository<Chain>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.chainRepo = entityManager.getRepository(Chain);
  }

  async get(
    options: FindOneOptions<Chain>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[ChainRepoService.get] finding chain [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.chainRepo.findOne(options);
      if (!result && panic)
        throw new GenericError('Chain not found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[ChainRepoService.get] error finding chain [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Chain>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[ChainRepoService.getAll] finding chains [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.chainRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError('No chains found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[ChainRepoService.getAll] error finding chains [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<Chain>): Promise<ResultWithError> {
    try {
      this.logger.info(`[ChainRepoService.create] saving chain`);

      const entity = this.chainRepo.create(data);
      const result = await this.chainRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[ChainRepoService.create] error saving chain: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<Chain>,
    partialEntity: QueryDeepPartialEntity<Chain>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[ChainRepoService.update] updating chain [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.chainRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[ChainRepoService.update] error updating chain [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<Chain>): Promise<{ error }> {
    try {
      this.logger.info(
        `[ChainRepoService.delete] deleting chain [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.chainRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[ChainRepoService.delete] error deleting chain [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(options: FindManyOptions<Chain>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[ChainRepoService.count] counting chains [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.chainRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[ChainRepoService.count] error counting chains [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
