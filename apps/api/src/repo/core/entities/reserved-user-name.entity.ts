import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'ReservedUserNames', schema: 'core' })
export class ReservedUserName extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  ReservedUserNameID: number;

  @ApiProperty()
  @Column({ type: 'varchar', length: 30, unique: true })
  Name: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 256, nullable: true })
  Reason: string;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  CreatedAt: Date;
}
