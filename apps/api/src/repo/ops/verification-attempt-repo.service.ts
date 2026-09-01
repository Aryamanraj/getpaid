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
import { VerificationAttempt } from './entities/verification-attempt.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class VerificationAttemptRepoService {
  private verificationAttemptRepo: Repository<VerificationAttempt>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.verificationAttemptRepo =
      entityManager.getRepository(VerificationAttempt);
  }

  async get(
    options: FindOneOptions<VerificationAttempt>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[VerificationAttemptRepoService.get] finding verification attempt [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.verificationAttemptRepo.findOne(options);
      if (!result && panic)
        throw new GenericError(
          'VerificationAttempt not found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationAttemptRepoService.get] error finding verification attempt [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<VerificationAttempt>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[VerificationAttemptRepoService.getAll] finding verification attempts [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.verificationAttemptRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError(
          'No verification attempts found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationAttemptRepoService.getAll] error finding verification attempts [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(
    data: DeepPartial<VerificationAttempt>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[VerificationAttemptRepoService.create] saving verification attempt`,
      );

      const entity = this.verificationAttemptRepo.create(data);
      const result = await this.verificationAttemptRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationAttemptRepoService.create] error saving verification attempt: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<VerificationAttempt>,
    partialEntity: QueryDeepPartialEntity<VerificationAttempt>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[VerificationAttemptRepoService.update] updating verification attempt [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.verificationAttemptRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationAttemptRepoService.update] error updating verification attempt [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(
    criteria: FindOptionsWhere<VerificationAttempt>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[VerificationAttemptRepoService.delete] deleting verification attempt [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.verificationAttemptRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationAttemptRepoService.delete] error deleting verification attempt [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(
    options: FindManyOptions<VerificationAttempt>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[VerificationAttemptRepoService.count] counting verification attempts [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.verificationAttemptRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationAttemptRepoService.count] error counting verification attempts [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
