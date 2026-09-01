import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

/**
 * Rotating refresh tokens. Every refresh issues a new row and revokes the old
 * one; reuse of a revoked token revokes the whole family.
 */
@Entity({ name: 'RefreshTokens', schema: 'core' })
@Index('IX_RefreshTokens_UserID', ['User'])
export class RefreshToken extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  RefreshTokenID: number;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'UserID' })
  User: User;

  @ApiProperty()
  @Column({ type: 'varchar', length: 128, unique: true })
  TokenHash: string;

  @ApiProperty({
    nullable: true,
    description: 'Shared by every token descended from one login',
  })
  @Column({ type: 'varchar', length: 64, nullable: true })
  FamilyID: string;

  @ApiProperty()
  @Column({ type: 'timestamptz' })
  ExpiresAt: Date;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  RevokedAt: Date;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 512, nullable: true })
  UserAgent: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  Ip: string;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  CreatedAt: Date;
}
