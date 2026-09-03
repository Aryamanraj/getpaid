import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { LessThanOrEqual } from 'typeorm';
import type { BlogPost, BlogPostSummary } from '@recv/shared';
import { BlogArticleRepoService } from '../repo/blogs/blog-article-repo.service';
import { BlogArticle } from '../repo/blogs/entities/blog-article.entity';
import { Domain } from '../repo/core/entities/domain.entity';
import { DomainService } from '../domain/domain.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { Promisify } from '../common/helpers/promisifier';

const PAGE_SIZE = 12;

/**
 * Serves articles the newsmith pipeline wrote into blogs.articles. Publishing
 * is a data predicate, not an event: a row with status='published' and
 * published_at <= now is public, so an article goes live the moment the
 * pipeline commits it — no cron, no webhook, nothing to trigger.
 */
@Injectable()
export class BlogService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private blogArticleRepo: BlogArticleRepoService,
    private domainService: DomainService,
    private platformConfigService: PlatformConfigService,
  ) {}

  /** blog.enabledHosts decides which domains have a blog at all. */
  private async assertEnabled(host: string): Promise<ResultWithError> {
    try {
      const domain = await Promisify<Domain>(
        this.domainService.getByHost(host),
      );
      const enabledHosts = await this.platformConfigService.getConfigOrDefault<
        string[]
      >('blog.enabledHosts', []);
      if (!enabledHosts.includes(domain.Host))
        throw new GenericError('This domain has no blog', HttpStatus.NOT_FOUND);
      return { data: true, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  private toSummary(a: BlogArticle): BlogPostSummary {
    return {
      slug: a.Slug,
      title: a.Title,
      excerpt: a.Excerpt,
      topic: a.Topic,
      tags: a.Tags ?? [],
      heroImageUrl: a.HeroImageUrl ?? undefined,
      publishedAt: a.PublishedAt.toISOString(),
    };
  }

  async getPosts(host: string, page: number): Promise<ResultWithError> {
    try {
      this.logger.info(`[BlogService.getPosts] host ${host} page ${page}`);
      await Promisify<boolean>(this.assertEnabled(host));

      const where = {
        Status: 'published',
        PublishedAt: LessThanOrEqual(new Date()),
      };
      const safePage = Math.max(1, page || 1);
      const [articles, total] = await Promise.all([
        Promisify<BlogArticle[]>(
          this.blogArticleRepo.getAll(
            {
              where,
              order: { PublishedAt: 'DESC' },
              take: PAGE_SIZE,
              skip: (safePage - 1) * PAGE_SIZE,
            },
            false,
          ),
        ),
        Promisify<number>(this.blogArticleRepo.count({ where })),
      ]);

      return {
        data: {
          items: (articles ?? []).map((a) => this.toSummary(a)),
          page: safePage,
          hasMore: safePage * PAGE_SIZE < total,
          total,
        },
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `[BlogService.getPosts] error for ${host}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getPost(host: string, slug: string): Promise<ResultWithError> {
    try {
      this.logger.info(`[BlogService.getPost] host ${host} slug ${slug}`);
      await Promisify<boolean>(this.assertEnabled(host));

      const article = await Promisify<BlogArticle>(
        this.blogArticleRepo.get({
          where: {
            Slug: slug,
            Status: 'published',
            PublishedAt: LessThanOrEqual(new Date()),
          },
        }),
      );

      const post: BlogPost = {
        ...this.toSummary(article),
        metaDescription: article.MetaDescription,
        bodyMarkdown: article.BodyMarkdown,
        sources: article.Sources ?? [],
      };
      return { data: post, error: null };
    } catch (error) {
      this.logger.error(
        `[BlogService.getPost] error for ${host}/${slug}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}
