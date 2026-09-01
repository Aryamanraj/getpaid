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
import { VerificationJob } from './entities/verification-job.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class VerificationJobRepoService {
  private verificationJobRepo: Repository<VerificationJob>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.verificationJobRepo = entityManager.getRepository(VerificationJob);
  }

  async get(
    options: FindOneOptions<VerificationJob>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[VerificationJobRepoService.get] finding verification job [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.verificationJobRepo.findOne(options);
      if (!result && panic)
        throw new GenericError(
          'VerificationJob not found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationJobRepoService.get] error finding verification job [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<VerificationJob>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[VerificationJobRepoService.getAll] finding verification jobs [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.verificationJobRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError(
          'No verification jobs found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationJobRepoService.getAll] error finding verification jobs [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<VerificationJob>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[VerificationJobRepoService.create] saving verification job`,
      );

      const entity = this.verificationJobRepo.create(data);
      const result = await this.verificationJobRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationJobRepoService.create] error saving verification job: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<VerificationJob>,
    partialEntity: QueryDeepPartialEntity<VerificationJob>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[VerificationJobRepoService.update] updating verification job [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.verificationJobRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationJobRepoService.update] error updating verification job [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(
    criteria: FindOptionsWhere<VerificationJob>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[VerificationJobRepoService.delete] deleting verification job [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.verificationJobRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationJobRepoService.delete] error deleting verification job [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(
    options: FindManyOptions<VerificationJob>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[VerificationJobRepoService.count] counting verification jobs [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.verificationJobRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[VerificationJobRepoService.count] error counting verification jobs [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
