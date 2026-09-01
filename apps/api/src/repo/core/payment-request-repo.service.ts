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
import { PaymentRequest } from './entities/payment-request.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class PaymentRequestRepoService {
  private paymentRequestRepo: Repository<PaymentRequest>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.paymentRequestRepo = entityManager.getRepository(PaymentRequest);
  }

  async get(
    options: FindOneOptions<PaymentRequest>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentRequestRepoService.get] finding payment request [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.paymentRequestRepo.findOne(options);
      if (!result && panic)
        throw new GenericError(
          'PaymentRequest not found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentRequestRepoService.get] error finding payment request [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<PaymentRequest>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentRequestRepoService.getAll] finding payment requests [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.paymentRequestRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError(
          'No payment requests found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentRequestRepoService.getAll] error finding payment requests [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<PaymentRequest>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentRequestRepoService.create] saving payment request`,
      );

      const entity = this.paymentRequestRepo.create(data);
      const result = await this.paymentRequestRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentRequestRepoService.create] error saving payment request: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<PaymentRequest>,
    partialEntity: QueryDeepPartialEntity<PaymentRequest>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[PaymentRequestRepoService.update] updating payment request [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.paymentRequestRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentRequestRepoService.update] error updating payment request [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<PaymentRequest>): Promise<{ error }> {
    try {
      this.logger.info(
        `[PaymentRequestRepoService.delete] deleting payment request [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.paymentRequestRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentRequestRepoService.delete] error deleting payment request [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(
    options: FindManyOptions<PaymentRequest>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentRequestRepoService.count] counting payment requests [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.paymentRequestRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentRequestRepoService.count] error counting payment requests [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
