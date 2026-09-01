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
import { TX_STATUS_ENUM, TX_SUBMISSION_ENUM } from '@recv/shared';
import { PaymentRequest } from './payment-request.entity';
import { Chain } from './chain.entity';
import { Asset } from './asset.entity';

@Entity({ name: 'PaymentTransactions', schema: 'core' })
@Index('UQ_PaymentTransactions_ChainID_TxHash', ['Chain', 'TxHash'], {
  unique: true,
})
export class PaymentTransaction extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  PaymentTransactionID: number;

  @ApiProperty({ type: () => PaymentRequest })
  @ManyToOne(
    () => PaymentRequest,
    (request) => request.PaymentTransactions,
    { nullable: false },
  )
  @JoinColumn({ name: 'PaymentRequestID' })
  PaymentRequest: PaymentRequest;

  @ApiProperty({ type: () => Chain })
  @ManyToOne(() => Chain, { nullable: false })
  @JoinColumn({ name: 'ChainID' })
  Chain: Chain;

  @ApiProperty({ type: () => Asset, nullable: true })
  @ManyToOne(() => Asset, { nullable: true })
  @JoinColumn({ name: 'AssetID' })
  Asset: Asset;

  @ApiProperty()
  @Column({ type: 'varchar', length: 128 })
  TxHash: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  FromAddress: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  ToAddress: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'numeric', precision: 78, scale: 0, nullable: true })
  AmountRaw: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'bigint', nullable: true })
  BlockNumber: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  BlockTimestamp: Date;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  Confirmations: number;

  @ApiProperty({ enum: TX_STATUS_ENUM })
  @Column({
    type: 'enum',
    enum: TX_STATUS_ENUM,
    enumName: 'tx_status_enum',
    default: TX_STATUS_ENUM.PENDING,
  })
  Status: TX_STATUS_ENUM;

  @ApiProperty({
    nullable: true,
    description: 'Why verification rejected this transaction',
  })
  @Column({ type: 'varchar', length: 512, nullable: true })
  MismatchReason: string;

  @ApiProperty({ enum: TX_SUBMISSION_ENUM })
  @Column({
    type: 'enum',
    enum: TX_SUBMISSION_ENUM,
    enumName: 'tx_submission_enum',
  })
  SubmittedVia: TX_SUBMISSION_ENUM;

  @ApiProperty({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  RawPayload: Record<string, unknown>;

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
