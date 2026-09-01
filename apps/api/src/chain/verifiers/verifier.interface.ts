import { NormalisedTransfer } from '@recv/shared';
import { Chain } from '../../repo/core/entities/chain.entity';
import { Asset } from '../../repo/core/entities/asset.entity';
import { ResultWithError } from '../../common/interfaces';

export interface VerifyParams {
  chain: Chain;
  asset: Asset;
  txHash: string;
  expectedTo: string;
}

/**
 * One implementation per namespace. Every verifier returns the same
 * NormalisedTransfer, so PaymentService has no per-chain branching.
 *
 * A verifier answers "what did this transaction do?", not "is it correct?" —
 * matching to the request is VerificationService's job. The exception is
 * `expectedTo`, which some chains need to pick the right output (Bitcoin can
 * pay several addresses in one tx; an ERC-20 tx can emit several Transfers).
 */
export interface ChainVerifier {
  verify(params: VerifyParams): Promise<ResultWithError>;
}

export interface NotFoundYet {
  notFound: true;
}

export type VerifierOutcome = NormalisedTransfer | NotFoundYet;

export const isNotFound = (v: VerifierOutcome): v is NotFoundYet =>
  (v as NotFoundYet)?.notFound === true;
