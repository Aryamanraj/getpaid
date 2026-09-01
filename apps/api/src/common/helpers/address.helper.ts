import { HttpStatus } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { getAddress, isAddress } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  validate as validateBitcoin,
  Network,
} from 'bitcoin-address-validation';
import { CHAIN_NAMESPACE_ENUM } from '@recv/shared';
import { GenericError } from '../errors/Generic.error';

/**
 * SV14 — every address is validated before it is stored or compared. A typo'd
 * payout address means permanently lost funds, so this is strict: an EVM
 * address with a wrong checksum is rejected, not lowercased.
 *
 * Returns the canonical form for the namespace.
 */
export function normaliseAddress(
  namespace: CHAIN_NAMESPACE_ENUM,
  input: string,
): string {
  const address = (input ?? '').trim();
  if (!address)
    throw new GenericError('Address is required', HttpStatus.BAD_REQUEST);

  switch (namespace) {
    case CHAIN_NAMESPACE_ENUM.EIP155: {
      if (!isAddress(address)) {
        throw new GenericError(
          'Invalid EVM address (check the checksum)',
          HttpStatus.BAD_REQUEST,
        );
      }
      return getAddress(address);
    }

    case CHAIN_NAMESPACE_ENUM.SOLANA: {
      let key: PublicKey;
      try {
        key = new PublicKey(address);
      } catch {
        throw new GenericError(
          'Invalid Solana address',
          HttpStatus.BAD_REQUEST,
        );
      }
      // Off-curve keys are PDAs — a wallet cannot sign for one, and native
      // SOL sent there needs a program to recover it.
      if (!PublicKey.isOnCurve(key.toBytes())) {
        throw new GenericError(
          'Solana address must be a wallet, not a program-derived address',
          HttpStatus.BAD_REQUEST,
        );
      }
      return key.toBase58();
    }

    case CHAIN_NAMESPACE_ENUM.BIP122: {
      if (!validateBitcoin(address, Network.mainnet)) {
        throw new GenericError(
          'Invalid Bitcoin address',
          HttpStatus.BAD_REQUEST,
        );
      }
      // bech32 is case-insensitive by spec; canonicalise to lowercase. Base58
      // forms are case-sensitive and left alone.
      return /^(bc1)/i.test(address) ? address.toLowerCase() : address;
    }

    case CHAIN_NAMESPACE_ENUM.TRON: {
      let bytes: Uint8Array;
      try {
        bytes = bs58.decode(address);
      } catch {
        throw new GenericError('Invalid Tron address', HttpStatus.BAD_REQUEST);
      }
      if (bytes.length !== 25 || bytes[0] !== 0x41) {
        throw new GenericError('Invalid Tron address', HttpStatus.BAD_REQUEST);
      }
      const payload = Buffer.from(bytes.subarray(0, 21));
      const checksum = Buffer.from(bytes.subarray(21));
      const expected = sha256(sha256(payload)).subarray(0, 4);
      if (!checksum.equals(expected)) {
        throw new GenericError(
          'Invalid Tron address (checksum mismatch)',
          HttpStatus.BAD_REQUEST,
        );
      }
      return address;
    }

    default:
      throw new GenericError(
        `Unsupported namespace: ${namespace}`,
        HttpStatus.BAD_REQUEST,
      );
  }
}

/**
 * Comparison rule per namespace: EVM is case-insensitive (checksum is just
 * display), everything else is exact.
 */
export function addressesEqual(
  namespace: CHAIN_NAMESPACE_ENUM,
  a: string,
  b: string,
): boolean {
  if (!a || !b) return false;
  return namespace === CHAIN_NAMESPACE_ENUM.EIP155
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
}

function sha256(data: Buffer): Buffer {
  return crypto.createHash('sha256').update(data).digest();
}
