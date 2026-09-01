import { CHAIN_NAMESPACE_ENUM } from '@recv/shared';
import { addressesEqual, normaliseAddress } from './helpers/address.helper';

describe('normaliseAddress', () => {
  it('checksums a lowercase EVM address', () => {
    expect(
      normaliseAddress(
        CHAIN_NAMESPACE_ENUM.EIP155,
        '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      ),
    ).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
  });

  it('rejects an EVM address with a wrong checksum — a typo means lost funds', () => {
    expect(() =>
      normaliseAddress(
        CHAIN_NAMESPACE_ENUM.EIP155,
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02914',
      ),
    ).toThrow(/checksum/);
  });

  it('accepts a real Solana wallet and rejects garbage', () => {
    expect(
      normaliseAddress(
        CHAIN_NAMESPACE_ENUM.SOLANA,
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      ),
    ).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    expect(() =>
      normaliseAddress(CHAIN_NAMESPACE_ENUM.SOLANA, 'nope'),
    ).toThrow();
  });

  it('lowercases bech32 Bitcoin and leaves base58 alone', () => {
    expect(
      normaliseAddress(
        CHAIN_NAMESPACE_ENUM.BIP122,
        'BC1QAR0SRRR7XFKVY5L643LYDNW9RE59GTZZWF5MDQ',
      ),
    ).toBe('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
    expect(
      normaliseAddress(
        CHAIN_NAMESPACE_ENUM.BIP122,
        '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      ),
    ).toBe('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2');
    expect(() =>
      normaliseAddress(CHAIN_NAMESPACE_ENUM.BIP122, 'bc1qinvalid'),
    ).toThrow();
  });

  it('validates the Tron base58check checksum', () => {
    expect(
      normaliseAddress(
        CHAIN_NAMESPACE_ENUM.TRON,
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      ),
    ).toBe('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
    expect(() =>
      normaliseAddress(
        CHAIN_NAMESPACE_ENUM.TRON,
        'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6u',
      ),
    ).toThrow(/checksum/);
  });
});

describe('addressesEqual', () => {
  it('is case-insensitive only for EVM', () => {
    expect(addressesEqual(CHAIN_NAMESPACE_ENUM.EIP155, '0xAbC', '0xabc')).toBe(
      true,
    );
    expect(addressesEqual(CHAIN_NAMESPACE_ENUM.SOLANA, 'AbC', 'abc')).toBe(
      false,
    );
  });
});
