import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PAYMENT_METHOD_TYPE_ENUM } from '@recv/shared';
import { User } from './user.entity';

/**
 * Crypto is served by PayoutAddresses + AcceptedAssets. This table carries the
 * v2 methods (UPI, bank transfer) so the pay page can render a mixed list
 * without a schema change later. Details are AES-encrypted and never returned
 * by list endpoints.
 */
@Entity({ name: 'PaymentMethods', schema: 'core' })
export class PaymentMethod extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  PaymentMethodID: number;

  @ApiProperty({ type: () => User })
  @ManyToOne(
    () => User,
    (user) => user.PaymentMethods,
    { nullable: false },
  )
  @JoinColumn({ name: 'UserID' })
  User: User;

  @ApiProperty({ enum: PAYMENT_METHOD_TYPE_ENUM })
  @Column({
    type: 'enum',
    enum: PAYMENT_METHOD_TYPE_ENUM,
    enumName: 'payment_method_type_enum',
  })
  MethodType: PAYMENT_METHOD_TYPE_ENUM;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  Label: string;

  @ApiProperty({ description: 'AES-encrypted payload — never exposed' })
  @Column({ type: 'text', nullable: true })
  Details: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  IsActive: boolean;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  SortOrder: number;

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
