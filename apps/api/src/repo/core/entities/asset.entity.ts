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
import { Chain } from './chain.entity';

@Entity({ name: 'Assets', schema: 'core' })
@Index('UQ_Assets_ChainID_ContractAddress', ['Chain', 'ContractAddress'], {
  unique: true,
})
export class Asset extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  AssetID: number;

  @ApiProperty({ type: () => Chain })
  @ManyToOne(
    () => Chain,
    (chain) => chain.Assets,
    { nullable: false },
  )
  @JoinColumn({ name: 'ChainID' })
  Chain: Chain;

  @ApiProperty({ example: 'USDC' })
  @Column({ type: 'varchar', length: 32 })
  Symbol: string;

  @ApiProperty({ example: 'USD Coin' })
  @Column({ type: 'varchar', length: 128 })
  Name: string;

  @ApiProperty({
    nullable: true,
    description: 'NULL means the chain native coin',
  })
  @Column({ type: 'varchar', length: 128, nullable: true })
  ContractAddress: string;

  @ApiProperty()
  @Column({ type: 'int' })
  Decimals: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'varchar', length: 2048, nullable: true })
  LogoUrl: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  IsStablecoin: boolean;

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
