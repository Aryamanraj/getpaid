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
import { User } from './entities/user.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class UserRepoService {
  private userRepo: Repository<User>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.userRepo = entityManager.getRepository(User);
  }

  async get(
    options: FindOneOptions<User>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[UserRepoService.get] finding user [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.userRepo.findOne(options);
      if (!result && panic)
        throw new GenericError('User not found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[UserRepoService.get] error finding user [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<User>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[UserRepoService.getAll] finding users [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.userRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError('No users found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[UserRepoService.getAll] error finding users [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<User>): Promise<ResultWithError> {
    try {
      this.logger.info(`[UserRepoService.create] saving user`);

      const entity = this.userRepo.create(data);
      const result = await this.userRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[UserRepoService.create] error saving user: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<User>,
    partialEntity: QueryDeepPartialEntity<User>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[UserRepoService.update] updating user [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.userRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[UserRepoService.update] error updating user [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<User>): Promise<{ error }> {
    try {
      this.logger.info(
        `[UserRepoService.delete] deleting user [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.userRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[UserRepoService.delete] error deleting user [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(options: FindManyOptions<User>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[UserRepoService.count] counting users [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.userRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[UserRepoService.count] error counting users [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
