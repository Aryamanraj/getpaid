import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { CHAIN_NAMESPACE_ENUM } from '@recv/shared';
import { Asset } from './asset.entity';

@Entity({ name: 'Chains', schema: 'core' })
@Index('UQ_Chains_Namespace_ChainRef', ['Namespace', 'ChainRef'], {
  unique: true,
})
export class Chain extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  ChainID: number;

  @ApiProperty({ enum: CHAIN_NAMESPACE_ENUM })
  @Column({
    type: 'enum',
    enum: CHAIN_NAMESPACE_ENUM,
    enumName: 'chain_namespace_enum',
  })
  Namespace: CHAIN_NAMESPACE_ENUM;

  @ApiProperty({
    example: '8453',
    description: 'EVM chain id, or network name',
  })
  @Column({ type: 'varchar', length: 64 })
  ChainRef: string;

  @ApiProperty({ example: 'Base' })
  @Column({ type: 'varchar', length: 64 })
  Name: string;

  @ApiProperty({ example: 'base' })
  @Column({ type: 'varchar', length: 64, unique: true })
  Slug: string;

  @ApiProperty({ example: 'ETH' })
  @Column({ type: 'varchar', length: 16 })
  NativeSymbol: string;

  @ApiProperty({ example: 18 })
  @Column({ type: 'int' })
  NativeDecimals: number;

  @ApiProperty({ example: 'https://basescan.org/tx/{txHash}' })
  @Column({ type: 'varchar', length: 512 })
  ExplorerTxUrlTemplate: string;

  @ApiProperty()
  @Column({ type: 'int', default: 1 })
  RequiredConfirmations: number;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  IsActive: boolean;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  SortOrder: number;

  @ApiProperty({ type: () => Asset, isArray: true })
  @OneToMany(
    () => Asset,
    (asset) => asset.Chain,
  )
  Assets: Asset[];

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
