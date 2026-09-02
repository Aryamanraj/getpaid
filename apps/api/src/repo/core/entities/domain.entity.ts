import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { DomainTheme } from '@recv/shared';
import { User } from './user.entity';

/**
 * One row per domain the app is served on. Everything domain-specific lives
 * here so adding a domain is DNS plus a row — no rebuild, no deploy.
 * See docs/ARCHITECTURE.md §4.
 */
@Entity({ name: 'Domains', schema: 'core' })
export class Domain extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  DomainID: number;

  @ApiProperty({ example: 'payee.id' })
  @Column({ type: 'varchar', length: 253, unique: true })
  Host: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  IsActive: boolean;

  @ApiProperty({
    description: 'Serves unknown-host requests and default links',
  })
  @Column({ type: 'boolean', default: false })
  IsDefault: boolean;

  @ApiProperty({
    type: () => Domain,
    nullable: true,
    description:
      'Set when this domain should 301 to another rather than render',
  })
  @ManyToOne(() => Domain, { nullable: true })
  @JoinColumn({ name: 'AliasOfDomainID' })
  AliasOfDomain: Domain;

  @ApiProperty()
  @Column({ type: 'varchar', length: 128 })
  BrandName: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 256, nullable: true })
  Tagline: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 2048, nullable: true })
  LogoUrl: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 2048, nullable: true })
  FaviconUrl: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  OgImageConfig: Record<string, unknown>;

  @ApiProperty({ description: 'Colour tokens, fontKey, radius, default mode' })
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  ThemeConfig: DomainTheme;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 320, nullable: true })
  SupportEmail: string;

  @ApiProperty({
    nullable: true,
    description: 'From address for mail sent on this domain',
  })
  @Column({ type: 'varchar', length: 320, nullable: true })
  MailFromAddress: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 256, nullable: true })
  LegalEntity: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  SocialLinks: Record<string, string>;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  SortOrder: number;

  @ApiProperty({ type: () => User, isArray: true })
  @OneToMany(
    () => User,
    (user) => user.Domain,
  )
  Users: User[];

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  CreatedAt: Date;

  @ApiProperty()
  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  UpdatedAt: Date;
}
