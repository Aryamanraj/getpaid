import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  Repository,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { BlogArticle } from './entities/blog-article.entity';
import { ResultWithError } from '../../common/interfaces';
import { GenericError } from '../../common/errors/Generic.error';

/**
 * Read-only by design: blogs.articles is owned and written by the newsmith
 * pipeline. No create/update/delete here — the website never mutates it.
 */
@Injectable()
export class BlogArticleRepoService {
  private articleRepo: Repository<BlogArticle>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.articleRepo = entityManager.getRepository(BlogArticle);
  }

  async get(
    options: FindOneOptions<BlogArticle>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[BlogArticleRepoService.get] finding article [condition: ${JSON.stringify(options.where)}]`,
      );

      const result = await this.articleRepo.findOne(options);
      if (!result && panic)
        throw new GenericError('Article not found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[BlogArticleRepoService.get] error finding article: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<BlogArticle>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[BlogArticleRepoService.getAll] finding articles [condition: ${JSON.stringify(options.where)}]`,
      );

      const result = await this.articleRepo.find(options);
      if (result.length === 0 && panic)
        throw new GenericError('No articles found', HttpStatus.NOT_FOUND);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[BlogArticleRepoService.getAll] error finding articles: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async count(options: FindManyOptions<BlogArticle>): Promise<ResultWithError> {
    try {
      const result = await this.articleRepo.count(options);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `[BlogArticleRepoService.count] error counting articles: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
