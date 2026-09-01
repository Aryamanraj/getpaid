import { Module } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { PlatformConfigModule } from '../platform-config/platform-config.module';
import { ChainService } from './chain.service';
import { EvmVerifier } from './verifiers/evm.verifier';
import { SolanaVerifier } from './verifiers/solana.verifier';
import { BitcoinVerifier } from './verifiers/bitcoin.verifier';
import { TronVerifier } from './verifiers/tron.verifier';
import { VerifierRegistry } from './verifier.registry';

@Module({
  imports: [RepoModule, PlatformConfigModule],
  providers: [
    ChainService,
    EvmVerifier,
    SolanaVerifier,
    BitcoinVerifier,
    TronVerifier,
    VerifierRegistry,
  ],
  exports: [ChainService, VerifierRegistry],
})
export class ChainModule {}
