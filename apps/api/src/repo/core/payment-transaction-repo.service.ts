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
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class PaymentTransactionRepoService {
  private paymentTransactionRepo: Repository<PaymentTransaction>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.paymentTransactionRepo =
      entityManager.getRepository(PaymentTransaction);
  }

  async get(
    options: FindOneOptions<PaymentTransaction>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentTransactionRepoService.get] finding payment transaction [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.paymentTransactionRepo.findOne(options);
      if (!result && panic)
        throw new GenericError(
          'PaymentTransaction not found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentTransactionRepoService.get] error finding payment transaction [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<PaymentTransaction>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentTransactionRepoService.getAll] finding payment transactions [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.paymentTransactionRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError(
          'No payment transactions found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentTransactionRepoService.getAll] error finding payment transactions [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(
    data: DeepPartial<PaymentTransaction>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentTransactionRepoService.create] saving payment transaction`,
      );

      const entity = this.paymentTransactionRepo.create(data);
      const result = await this.paymentTransactionRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentTransactionRepoService.create] error saving payment transaction: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<PaymentTransaction>,
    partialEntity: QueryDeepPartialEntity<PaymentTransaction>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[PaymentTransactionRepoService.update] updating payment transaction [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.paymentTransactionRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentTransactionRepoService.update] error updating payment transaction [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(
    criteria: FindOptionsWhere<PaymentTransaction>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[PaymentTransactionRepoService.delete] deleting payment transaction [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.paymentTransactionRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentTransactionRepoService.delete] error deleting payment transaction [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(
    options: FindManyOptions<PaymentTransaction>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PaymentTransactionRepoService.count] counting payment transactions [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.paymentTransactionRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PaymentTransactionRepoService.count] error counting payment transactions [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
