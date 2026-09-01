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
import { AuthNonce } from './entities/auth-nonce.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class AuthNonceRepoService {
  private authNonceRepo: Repository<AuthNonce>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.authNonceRepo = entityManager.getRepository(AuthNonce);
  }

  async get(
    options: FindOneOptions<AuthNonce>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AuthNonceRepoService.get] finding auth nonce [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.authNonceRepo.findOne(options);
      if (!result && panic)
        throw new GenericError('AuthNonce not found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthNonceRepoService.get] error finding auth nonce [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<AuthNonce>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AuthNonceRepoService.getAll] finding auth nonces [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.authNonceRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError('No auth nonces found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthNonceRepoService.getAll] error finding auth nonces [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<AuthNonce>): Promise<ResultWithError> {
    try {
      this.logger.info(`[AuthNonceRepoService.create] saving auth nonce`);

      const entity = this.authNonceRepo.create(data);
      const result = await this.authNonceRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthNonceRepoService.create] error saving auth nonce: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<AuthNonce>,
    partialEntity: QueryDeepPartialEntity<AuthNonce>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[AuthNonceRepoService.update] updating auth nonce [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.authNonceRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[AuthNonceRepoService.update] error updating auth nonce [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<AuthNonce>): Promise<{ error }> {
    try {
      this.logger.info(
        `[AuthNonceRepoService.delete] deleting auth nonce [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.authNonceRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[AuthNonceRepoService.delete] error deleting auth nonce [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(options: FindManyOptions<AuthNonce>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AuthNonceRepoService.count] counting auth nonces [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.authNonceRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthNonceRepoService.count] error counting auth nonces [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
