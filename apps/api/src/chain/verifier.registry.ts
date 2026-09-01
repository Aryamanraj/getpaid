import { HttpStatus, Injectable } from '@nestjs/common';
import { CHAIN_NAMESPACE_ENUM } from '@recv/shared';
import { ChainVerifier } from './verifiers/verifier.interface';
import { EvmVerifier } from './verifiers/evm.verifier';
import { SolanaVerifier } from './verifiers/solana.verifier';
import { BitcoinVerifier } from './verifiers/bitcoin.verifier';
import { TronVerifier } from './verifiers/tron.verifier';
import { GenericError } from '../common/errors/Generic.error';

@Injectable()
export class VerifierRegistry {
  private readonly byNamespace: Record<CHAIN_NAMESPACE_ENUM, ChainVerifier>;

  constructor(
    evm: EvmVerifier,
    solana: SolanaVerifier,
    bitcoin: BitcoinVerifier,
    tron: TronVerifier,
  ) {
    this.byNamespace = {
      [CHAIN_NAMESPACE_ENUM.EIP155]: evm,
      [CHAIN_NAMESPACE_ENUM.SOLANA]: solana,
      [CHAIN_NAMESPACE_ENUM.BIP122]: bitcoin,
      [CHAIN_NAMESPACE_ENUM.TRON]: tron,
    };
  }

  for(namespace: CHAIN_NAMESPACE_ENUM): ChainVerifier {
    const verifier = this.byNamespace[namespace];
    if (!verifier)
      throw new GenericError(
        `No verifier for ${namespace}`,
        HttpStatus.NOT_IMPLEMENTED,
      );
    return verifier;
  }
}
