import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AUTH_PROVIDER_ENUM, CHAIN_NAMESPACE_ENUM } from '@recv/shared';
import { User } from './user.entity';

/**
 * One user, many identities. Email OTP and wallet signatures both land here,
 * so a user can sign in either way once both are linked.
 */
@Entity({ name: 'AuthIdentities', schema: 'core' })
@Index('UQ_AuthIdentities_Provider_Identifier', ['Provider', 'Identifier'], {
  unique: true,
})
export class AuthIdentity extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  AuthIdentityID: number;

  @ApiProperty({ type: () => User })
  @ManyToOne(
    () => User,
    (user) => user.AuthIdentities,
    { nullable: false },
  )
  @JoinColumn({ name: 'UserID' })
  User: User;

  @ApiProperty({ enum: AUTH_PROVIDER_ENUM })
  @Column({
    type: 'enum',
    enum: AUTH_PROVIDER_ENUM,
    enumName: 'auth_provider_enum',
  })
  Provider: AUTH_PROVIDER_ENUM;

  @ApiProperty({ description: 'Email address, or wallet address' })
  @Column({ type: 'varchar', length: 320 })
  Identifier: string;

  @ApiProperty({ enum: CHAIN_NAMESPACE_ENUM, nullable: true })
  @Column({
    type: 'enum',
    enum: CHAIN_NAMESPACE_ENUM,
    enumName: 'chain_namespace_enum',
    nullable: true,
  })
  Namespace: CHAIN_NAMESPACE_ENUM;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  IsPrimary: boolean;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  VerifiedAt: Date;

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
