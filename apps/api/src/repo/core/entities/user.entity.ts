import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Domain } from './domain.entity';
import { AuthIdentity } from './auth-identity.entity';
import { PayoutAddress } from './payout-address.entity';
import { AcceptedAsset } from './accepted-asset.entity';
import { PaymentMethod } from './payment-method.entity';
import { PaymentRequest } from './payment-request.entity';

@Entity({ name: 'Users', schema: 'core' })
export class User extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  UserID: number;

  @ApiProperty({
    nullable: true,
    description:
      'Stored lowercase; unique across every domain. NULL until claimed',
  })
  @Index('UQ_Users_UserName', { unique: true })
  @Column({ type: 'varchar', length: 30, nullable: true })
  UserName: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  DisplayName: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 280, nullable: true })
  Bio: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 2048, nullable: true })
  AvatarUrl: string;

  @ApiProperty({ type: () => Domain, nullable: true })
  @ManyToOne(
    () => Domain,
    (domain) => domain.Users,
    { nullable: true },
  )
  @JoinColumn({ name: 'PreferredDomainID' })
  PreferredDomain: Domain;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  IsActive: boolean;

  @ApiProperty({ type: () => AuthIdentity, isArray: true })
  @OneToMany(
    () => AuthIdentity,
    (identity) => identity.User,
  )
  AuthIdentities: AuthIdentity[];

  @ApiProperty({ type: () => PayoutAddress, isArray: true })
  @OneToMany(
    () => PayoutAddress,
    (address) => address.User,
  )
  PayoutAddresses: PayoutAddress[];

  @ApiProperty({ type: () => AcceptedAsset, isArray: true })
  @OneToMany(
    () => AcceptedAsset,
    (accepted) => accepted.User,
  )
  AcceptedAssets: AcceptedAsset[];

  @ApiProperty({ type: () => PaymentMethod, isArray: true })
  @OneToMany(
    () => PaymentMethod,
    (method) => method.User,
  )
  PaymentMethods: PaymentMethod[];

  @ApiProperty({ type: () => PaymentRequest, isArray: true })
  @OneToMany(
    () => PaymentRequest,
    (request) => request.PayeeUser,
  )
  PaymentRequests: PaymentRequest[];

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
