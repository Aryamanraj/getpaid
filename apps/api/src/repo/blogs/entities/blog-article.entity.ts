import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Read-only mapping of blogs.articles, which is OWNED by the newsmith
 * pipeline (its own sqlx migrations create and evolve it). The website only
 * ever reads: an article is public the moment newsmith writes it with
 * status='published'. Column names are snake_case because the schema is not
 * ours; property names keep our conventions.
 */
@Entity({ name: 'articles', schema: 'blogs', synchronize: false })
export class BlogArticle extends BaseEntity {
  @ApiProperty()
  @PrimaryColumn({ type: 'uuid', name: 'id' })
  Id: string;

  @ApiProperty()
  @Column({ type: 'text', name: 'slug' })
  Slug: string;

  @ApiProperty()
  @Column({ type: 'text', name: 'title' })
  Title: string;

  @ApiProperty()
  @Column({ type: 'text', name: 'meta_description' })
  MetaDescription: string;

  @ApiProperty()
  @Column({ type: 'text', name: 'excerpt' })
  Excerpt: string;

  @ApiProperty()
  @Column({ type: 'text', name: 'body_markdown' })
  BodyMarkdown: string;

  @ApiProperty()
  @Column({ type: 'text', name: 'topic' })
  Topic: string;

  @ApiProperty({ isArray: true })
  @Column({ type: 'text', array: true, name: 'tags' })
  Tags: string[];

  @ApiProperty({ description: 'Scraped sources cited by the piece' })
  @Column({ type: 'jsonb', name: 'sources' })
  Sources: Array<{ title: string; url: string }>;

  @ApiProperty({ nullable: true })
  @Column({ type: 'text', name: 'hero_image_url', nullable: true })
  HeroImageUrl: string;

  @ApiProperty({ description: 'published | rejected' })
  @Column({ type: 'text', name: 'status' })
  Status: string;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'published_at' })
  PublishedAt: Date;

  @ApiProperty()
  @Column({ type: 'timestamptz', name: 'created_at' })
  CreatedAt: Date;
}
