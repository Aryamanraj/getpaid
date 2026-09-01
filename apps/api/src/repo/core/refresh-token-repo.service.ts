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
import { RefreshToken } from './entities/refresh-token.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class RefreshTokenRepoService {
  private refreshTokenRepo: Repository<RefreshToken>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.refreshTokenRepo = entityManager.getRepository(RefreshToken);
  }

  async get(
    options: FindOneOptions<RefreshToken>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[RefreshTokenRepoService.get] finding refresh token [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.refreshTokenRepo.findOne(options);
      if (!result && panic)
        throw new GenericError('RefreshToken not found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[RefreshTokenRepoService.get] error finding refresh token [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<RefreshToken>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[RefreshTokenRepoService.getAll] finding refresh tokens [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.refreshTokenRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError('No refresh tokens found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[RefreshTokenRepoService.getAll] error finding refresh tokens [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<RefreshToken>): Promise<ResultWithError> {
    try {
      this.logger.info(`[RefreshTokenRepoService.create] saving refresh token`);

      const entity = this.refreshTokenRepo.create(data);
      const result = await this.refreshTokenRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[RefreshTokenRepoService.create] error saving refresh token: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<RefreshToken>,
    partialEntity: QueryDeepPartialEntity<RefreshToken>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[RefreshTokenRepoService.update] updating refresh token [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.refreshTokenRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[RefreshTokenRepoService.update] error updating refresh token [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<RefreshToken>): Promise<{ error }> {
    try {
      this.logger.info(
        `[RefreshTokenRepoService.delete] deleting refresh token [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.refreshTokenRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[RefreshTokenRepoService.delete] error deleting refresh token [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(
    options: FindManyOptions<RefreshToken>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[RefreshTokenRepoService.count] counting refresh tokens [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.refreshTokenRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[RefreshTokenRepoService.count] error counting refresh tokens [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
