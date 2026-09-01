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
import { User } from './user.entity';
import { Asset } from './asset.entity';
import { PayoutAddress } from './payout-address.entity';

/**
 * The join that renders the pay page: which assets a user accepts, and which
 * address each one settles to.
 */
@Entity({ name: 'AcceptedAssets', schema: 'core' })
@Index('UQ_AcceptedAssets_UserID_AssetID', ['User', 'Asset'], { unique: true })
export class AcceptedAsset extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  AcceptedAssetID: number;

  @ApiProperty({ type: () => User })
  @ManyToOne(
    () => User,
    (user) => user.AcceptedAssets,
    { nullable: false },
  )
  @JoinColumn({ name: 'UserID' })
  User: User;

  @ApiProperty({ type: () => Asset })
  @ManyToOne(() => Asset, { nullable: false })
  @JoinColumn({ name: 'AssetID' })
  Asset: Asset;

  @ApiProperty({ type: () => PayoutAddress })
  @ManyToOne(
    () => PayoutAddress,
    (address) => address.AcceptedAssets,
    { nullable: false },
  )
  @JoinColumn({ name: 'PayoutAddressID' })
  PayoutAddress: PayoutAddress;

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
