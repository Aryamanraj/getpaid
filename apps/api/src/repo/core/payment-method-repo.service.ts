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
import { PaymentMethod } from './entities/payment-method.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class PaymentMethodRepoService {
  private paymentMethodRepo: Repository<PaymentMethod>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.paymentMethodRepo = entityManager.getRepository(PaymentMethod);
  }

  async get(
    options: FindOneOptions<PaymentMethod>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentMethodRepoService.get] finding payment method [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.paymentMethodRepo.findOne(options);
      if (!result && panic)
        throw new GenericError('PaymentMethod not found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentMethodRepoService.get] error finding payment method [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<PaymentMethod>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentMethodRepoService.getAll] finding payment methods [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.paymentMethodRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError(
          'No payment methods found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentMethodRepoService.getAll] error finding payment methods [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<PaymentMethod>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentMethodRepoService.create] saving payment method`,
      );

      const entity = this.paymentMethodRepo.create(data);
      const result = await this.paymentMethodRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentMethodRepoService.create] error saving payment method: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<PaymentMethod>,
    partialEntity: QueryDeepPartialEntity<PaymentMethod>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[PaymentMethodRepoService.update] updating payment method [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.paymentMethodRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentMethodRepoService.update] error updating payment method [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<PaymentMethod>): Promise<{ error }> {
    try {
      this.logger.info(
        `[PaymentMethodRepoService.delete] deleting payment method [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.paymentMethodRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentMethodRepoService.delete] error deleting payment method [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(
    options: FindManyOptions<PaymentMethod>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentMethodRepoService.count] counting payment methods [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.paymentMethodRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentMethodRepoService.count] error counting payment methods [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
