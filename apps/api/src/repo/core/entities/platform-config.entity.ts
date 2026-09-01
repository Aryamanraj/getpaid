import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

/**
 * The source of truth for every runtime setting. See
 * docs/PLATFORM_CONFIG_KEYS.md — that file must be updated by any PR touching
 * a key.
 *
 * IsSecret rows hold { enc: "iv:authTag:ciphertext" } and are decrypted by
 * PlatformConfigService. A CHECK constraint enforces NOT (IsSecret AND
 * IsPublic), so a secret can never be exposed by an admin mistake.
 */
@Entity({ name: 'PlatformConfig', schema: 'core' })
export class PlatformConfig extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  PlatformConfigID: number;

  @ApiProperty({ example: 'auth.otp.ttlSeconds' })
  @Column({ type: 'varchar', length: 128, unique: true })
  Key: string;

  @ApiProperty({ description: 'String, number, boolean, array or object' })
  @Column({ type: 'jsonb' })
  Value: unknown;

  @ApiProperty({ nullable: true })
  @Column({ type: 'text', nullable: true })
  Description: string;

  @ApiProperty({ description: 'AES-encrypted at rest; never cached in Redis' })
  @Column({ type: 'boolean', default: false })
  IsSecret: boolean;

  @ApiProperty({ description: 'Included in the browser bootstrap payload' })
  @Column({ type: 'boolean', default: false })
  IsPublic: boolean;

  @ApiProperty({ nullable: true })
  @Column({ type: 'int', nullable: true })
  CacheTtlSeconds: number;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  IsActive: boolean;

  @ApiProperty({ type: () => User, nullable: true })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'UpdatedBy' })
  UpdatedByUser: User;

  @ApiProperty({
    nullable: true,
    description:
      'Unix ms prefix of the seed file that last wrote this row. NULL means ' +
      'human-owned and seeds skip it forever. Seed-runner-only — never write ' +
      'this from the admin API.',
  })
  @Column({ type: 'bigint', nullable: true })
  SeedUpdatedAt: string;

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
