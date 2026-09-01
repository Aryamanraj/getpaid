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
import { AuthIdentity } from './entities/auth-identity.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class AuthIdentityRepoService {
  private authIdentityRepo: Repository<AuthIdentity>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.authIdentityRepo = entityManager.getRepository(AuthIdentity);
  }

  async get(
    options: FindOneOptions<AuthIdentity>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AuthIdentityRepoService.get] finding auth identity [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.authIdentityRepo.findOne(options);
      if (!result && panic)
        throw new GenericError('AuthIdentity not found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthIdentityRepoService.get] error finding auth identity [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<AuthIdentity>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AuthIdentityRepoService.getAll] finding auth identities [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.authIdentityRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError(
          'No auth identities found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthIdentityRepoService.getAll] error finding auth identities [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<AuthIdentity>): Promise<ResultWithError> {
    try {
      this.logger.info(`[AuthIdentityRepoService.create] saving auth identity`);

      const entity = this.authIdentityRepo.create(data);
      const result = await this.authIdentityRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthIdentityRepoService.create] error saving auth identity: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<AuthIdentity>,
    partialEntity: QueryDeepPartialEntity<AuthIdentity>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[AuthIdentityRepoService.update] updating auth identity [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.authIdentityRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[AuthIdentityRepoService.update] error updating auth identity [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<AuthIdentity>): Promise<{ error }> {
    try {
      this.logger.info(
        `[AuthIdentityRepoService.delete] deleting auth identity [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.authIdentityRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[AuthIdentityRepoService.delete] error deleting auth identity [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(
    options: FindManyOptions<AuthIdentity>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[AuthIdentityRepoService.count] counting auth identities [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.authIdentityRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthIdentityRepoService.count] error counting auth identities [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
