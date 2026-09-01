import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { CHAIN_NAMESPACE_ENUM } from '@recv/shared';

@Entity({ name: 'AuthNonces', schema: 'core' })
@Index('IX_AuthNonces_Address_ExpiresAt', ['Address', 'ExpiresAt'])
export class AuthNonce extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  AuthNonceID: number;

  @ApiProperty()
  @Column({ type: 'varchar', length: 128 })
  Address: string;

  @ApiProperty({ enum: CHAIN_NAMESPACE_ENUM })
  @Column({
    type: 'enum',
    enum: CHAIN_NAMESPACE_ENUM,
    enumName: 'chain_namespace_enum',
  })
  Namespace: CHAIN_NAMESPACE_ENUM;

  @ApiProperty()
  @Column({ type: 'varchar', length: 128, unique: true })
  Nonce: string;

  @ApiProperty()
  @Column({ type: 'timestamptz' })
  ExpiresAt: Date;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  ConsumedAt: Date;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  CreatedAt: Date;
}
