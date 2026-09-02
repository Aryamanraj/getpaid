import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'OtpCodes', schema: 'core' })
@Index('IX_OtpCodes_DomainID_Email_ExpiresAt', [
  'DomainID',
  'Email',
  'ExpiresAt',
])
export class OtpCode extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  OtpCodeID: number;

  @ApiProperty({ description: 'Domain the code was requested on' })
  @Column({ type: 'int' })
  DomainID: number;

  @ApiProperty()
  @Column({ type: 'varchar', length: 320 })
  Email: string;

  @ApiProperty({ description: 'Hashed — the plaintext code is never stored' })
  @Column({ type: 'varchar', length: 128 })
  CodeHash: string;

  @ApiProperty()
  @Column({ type: 'timestamptz' })
  ExpiresAt: Date;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  ConsumedAt: Date;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  Attempts: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  RequestIp: string;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  CreatedAt: Date;
}
