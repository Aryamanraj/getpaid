import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Every admin write lands here. PlatformConfig secret values are redacted
 * before the row is written.
 */
@Entity({ name: 'AdminActionLog', schema: 'ops' })
@Index('IX_AdminActionLog_Entity_CreatedAt', ['EntityName', 'CreatedAt'])
export class AdminActionLog extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  AdminActionLogID: number;

  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  Action: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  EntityName: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  EntityRef: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  Payload: Record<string, unknown>;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  Ip: string;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  CreatedAt: Date;
}
