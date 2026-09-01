import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { VerificationJob } from './verification-job.entity';

@Entity({ name: 'VerificationAttempts', schema: 'ops' })
export class VerificationAttempt extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  VerificationAttemptID: number;

  @ApiProperty({ type: () => VerificationJob })
  @ManyToOne(
    () => VerificationJob,
    (job) => job.VerificationAttempts,
    { nullable: false },
  )
  @JoinColumn({ name: 'VerificationJobID' })
  VerificationJob: VerificationJob;

  @ApiProperty()
  @Column({ type: 'int' })
  AttemptNumber: number;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  Succeeded: boolean;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  RpcEndpointUsed: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'int', nullable: true })
  DurationMs: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 1024, nullable: true })
  Outcome: string;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  CreatedAt: Date;
}
