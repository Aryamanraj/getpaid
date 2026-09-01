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
import { VERIFICATION_JOB_STATUS_ENUM } from '@recv/shared';
import { PaymentTransaction } from '../../core/entities/payment-transaction.entity';
import { VerificationAttempt } from './verification-attempt.entity';

@Entity({ name: 'VerificationJobs', schema: 'ops' })
@Index('IX_VerificationJobs_Status_NextRunAt', ['Status', 'NextRunAt'])
export class VerificationJob extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  VerificationJobID: number;

  @ApiProperty({ type: () => PaymentTransaction })
  @ManyToOne(() => PaymentTransaction, { nullable: false })
  @JoinColumn({ name: 'PaymentTransactionID' })
  PaymentTransaction: PaymentTransaction;

  @ApiProperty({ enum: VERIFICATION_JOB_STATUS_ENUM })
  @Column({
    type: 'enum',
    enum: VERIFICATION_JOB_STATUS_ENUM,
    enumName: 'verification_job_status_enum',
    default: VERIFICATION_JOB_STATUS_ENUM.QUEUED,
  })
  Status: VERIFICATION_JOB_STATUS_ENUM;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  AttemptCount: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  NextRunAt: Date;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 1024, nullable: true })
  LastError: string;

  @ApiProperty({ type: () => VerificationAttempt, isArray: true })
  @OneToMany(
    () => VerificationAttempt,
    (attempt) => attempt.VerificationJob,
  )
  VerificationAttempts: VerificationAttempt[];

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
