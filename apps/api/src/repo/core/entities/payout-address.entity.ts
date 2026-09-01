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
import { CHAIN_NAMESPACE_ENUM } from '@recv/shared';
import { User } from './user.entity';
import { AcceptedAsset } from './accepted-asset.entity';

/**
 * Keyed on namespace rather than chain: one EVM address serves Ethereum, Base,
 * Arbitrum and Polygon, so the user pastes it once.
 */
@Entity({ name: 'PayoutAddresses', schema: 'core' })
@Index(
  'UQ_PayoutAddresses_UserID_Namespace_Address',
  ['User', 'Namespace', 'Address'],
  { unique: true },
)
export class PayoutAddress extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  PayoutAddressID: number;

  @ApiProperty({ type: () => User })
  @ManyToOne(
    () => User,
    (user) => user.PayoutAddresses,
    { nullable: false },
  )
  @JoinColumn({ name: 'UserID' })
  User: User;

  @ApiProperty({ enum: CHAIN_NAMESPACE_ENUM })
  @Column({
    type: 'enum',
    enum: CHAIN_NAMESPACE_ENUM,
    enumName: 'chain_namespace_enum',
  })
  Namespace: CHAIN_NAMESPACE_ENUM;

  @ApiProperty()
  @Column({ type: 'varchar', length: 128 })
  Address: string;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  Label: string;

  @ApiProperty({
    description: 'True when this address is also a linked auth identity',
  })
  @Column({ type: 'boolean', default: false })
  IsProven: boolean;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  IsActive: boolean;

  @ApiProperty({ type: () => AcceptedAsset, isArray: true })
  @OneToMany(
    () => AcceptedAsset,
    (accepted) => accepted.PayoutAddress,
  )
  AcceptedAssets: AcceptedAsset[];

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
