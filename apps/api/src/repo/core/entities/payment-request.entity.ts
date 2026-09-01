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
import { PAYMENT_REQUEST_STATUS_ENUM } from '@recv/shared';
import { User } from './user.entity';
import { Domain } from './domain.entity';
import { Asset } from './asset.entity';
import { Chain } from './chain.entity';
import { PaymentTransaction } from './payment-transaction.entity';

/**
 * ToAddress and AmountRaw are snapshotted at creation. A payee editing their
 * address later must not change what an existing receipt says was paid.
 *
 * Amounts are denominated in the asset sent — there is no fiat anywhere.
 */
@Entity({ name: 'PaymentRequests', schema: 'core' })
@Index('IX_PaymentRequests_PayeeUserID', ['PayeeUser'])
@Index('IX_PaymentRequests_Status', ['Status'])
export class PaymentRequest extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  PaymentRequestID: number;

  @ApiProperty({ description: 'Opaque id used in /r/[publicId] URLs' })
  @Column({ type: 'varchar', length: 32, unique: true })
  PublicID: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(
    () => User,
    (user) => user.PaymentRequests,
    { nullable: false },
  )
  @JoinColumn({ name: 'PayeeUserID' })
  PayeeUser: User;

  @ApiProperty({ type: () => Domain, nullable: true })
  @ManyToOne(() => Domain, { nullable: true })
  @JoinColumn({ name: 'DomainID' })
  Domain: Domain;

  @ApiProperty({ type: () => Asset })
  @ManyToOne(() => Asset, { nullable: false })
  @JoinColumn({ name: 'AssetID' })
  Asset: Asset;

  @ApiProperty({ type: () => Chain })
  @ManyToOne(() => Chain, { nullable: false })
  @JoinColumn({ name: 'ChainID' })
  Chain: Chain;

  @ApiProperty()
  @Column({ type: 'varchar', length: 128 })
  ToAddress: string;

  @ApiProperty({ description: 'Base units, as a string. Never a JS number' })
  @Column({ type: 'numeric', precision: 78, scale: 0 })
  AmountRaw: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 280, nullable: true })
  Note: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  PayerName: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 320, nullable: true })
  PayerEmail: string;

  @ApiProperty({ enum: PAYMENT_REQUEST_STATUS_ENUM })
  @Column({
    type: 'enum',
    enum: PAYMENT_REQUEST_STATUS_ENUM,
    enumName: 'payment_request_status_enum',
    default: PAYMENT_REQUEST_STATUS_ENUM.PENDING,
  })
  Status: PAYMENT_REQUEST_STATUS_ENUM;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  ExpiresAt: Date;

  @ApiProperty({ type: () => PaymentTransaction, isArray: true })
  @OneToMany(
    () => PaymentTransaction,
    (tx) => tx.PaymentRequest,
  )
  PaymentTransactions: PaymentTransaction[];

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
