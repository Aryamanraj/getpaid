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
import { OtpCode } from './entities/otp-code.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class OtpCodeRepoService {
  private otpCodeRepo: Repository<OtpCode>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.otpCodeRepo = entityManager.getRepository(OtpCode);
  }

  async get(
    options: FindOneOptions<OtpCode>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[OtpCodeRepoService.get] finding otp code [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.otpCodeRepo.findOne(options);
      if (!result && panic)
        throw new GenericError('OtpCode not found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[OtpCodeRepoService.get] error finding otp code [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<OtpCode>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[OtpCodeRepoService.getAll] finding otp codes [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.otpCodeRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError('No otp codes found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[OtpCodeRepoService.getAll] error finding otp codes [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<OtpCode>): Promise<ResultWithError> {
    try {
      this.logger.info(`[OtpCodeRepoService.create] saving otp code`);

      const entity = this.otpCodeRepo.create(data);
      const result = await this.otpCodeRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[OtpCodeRepoService.create] error saving otp code: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<OtpCode>,
    partialEntity: QueryDeepPartialEntity<OtpCode>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[OtpCodeRepoService.update] updating otp code [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.otpCodeRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[OtpCodeRepoService.update] error updating otp code [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<OtpCode>): Promise<{ error }> {
    try {
      this.logger.info(
        `[OtpCodeRepoService.delete] deleting otp code [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.otpCodeRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[OtpCodeRepoService.delete] error deleting otp code [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(options: FindManyOptions<OtpCode>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[OtpCodeRepoService.count] counting otp codes [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.otpCodeRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[OtpCodeRepoService.count] error counting otp codes [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
