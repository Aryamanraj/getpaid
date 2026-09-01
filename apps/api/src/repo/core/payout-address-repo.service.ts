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
import { PayoutAddress } from './entities/payout-address.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

@Injectable()
export class PayoutAddressRepoService {
  private payoutAddressRepo: Repository<PayoutAddress>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.payoutAddressRepo = entityManager.getRepository(PayoutAddress);
  }

  async get(
    options: FindOneOptions<PayoutAddress>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PayoutAddressRepoService.get] finding payout address [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.payoutAddressRepo.findOne(options);
      if (!result && panic)
        throw new GenericError('PayoutAddress not found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PayoutAddressRepoService.get] error finding payout address [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<PayoutAddress>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PayoutAddressRepoService.getAll] finding payout addresses [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.payoutAddressRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError(
          'No payout addresses found',
          HttpStatus.NOT_FOUND,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PayoutAddressRepoService.getAll] error finding payout addresses [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: DeepPartial<PayoutAddress>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PayoutAddressRepoService.create] saving payout address`,
      );

      const entity = this.payoutAddressRepo.create(data);
      const result = await this.payoutAddressRepo.save(entity);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PayoutAddressRepoService.create] error saving payout address: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    criteria: FindOptionsWhere<PayoutAddress>,
    partialEntity: QueryDeepPartialEntity<PayoutAddress>,
  ): Promise<{ error }> {
    try {
      this.logger.info(
        `[PayoutAddressRepoService.update] updating payout address [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.payoutAddressRepo.update(criteria, partialEntity);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[PayoutAddressRepoService.update] error updating payout address [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async delete(criteria: FindOptionsWhere<PayoutAddress>): Promise<{ error }> {
    try {
      this.logger.info(
        `[PayoutAddressRepoService.delete] deleting payout address [criteria: ${JSON.stringify(criteria)}]`,
      );

      await this.payoutAddressRepo.delete(criteria);
      return { error: null };
    } catch (error) {
      this.logger.error(
        `[PayoutAddressRepoService.delete] error deleting payout address [criteria: ${JSON.stringify(criteria)}]: ${error.stack}`,
      );
      return { error };
    }
  }

  async count(
    options: FindManyOptions<PayoutAddress>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[PayoutAddressRepoService.count] counting payout addresses [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.payoutAddressRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[PayoutAddressRepoService.count] error counting payout addresses [condition: ${JSON.stringify(options)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
