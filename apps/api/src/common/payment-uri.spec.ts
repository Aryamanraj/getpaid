import {
  CHAIN_NAMESPACE_ENUM,
  buildPaymentUri,
  checkUserNameShape,
  normaliseUserName,
} from '@recv/shared';

describe('buildPaymentUri', () => {
  it('encodes an EVM native transfer in wei', () => {
    expect(
      buildPaymentUri({
        namespace: CHAIN_NAMESPACE_ENUM.EIP155,
        chainRef: '8453',
        toAddress: '0xTO',
        amountRaw: '1000000000000000000',
        decimals: 18,
      }),
    ).toBe('ethereum:0xTO@8453?value=1000000000000000000');
  });

  it('encodes an ERC-20 transfer against the token contract', () => {
    expect(
      buildPaymentUri({
        namespace: CHAIN_NAMESPACE_ENUM.EIP155,
        chainRef: '8453',
        toAddress: '0xTO',
        contractAddress: '0xUSDC',
        amountRaw: '25000000',
        decimals: 6,
      }),
    ).toBe('ethereum:0xUSDC@8453/transfer?address=0xTO&uint256=25000000');
  });

  it('converts base units to a decimal amount for Solana Pay', () => {
    expect(
      buildPaymentUri({
        namespace: CHAIN_NAMESPACE_ENUM.SOLANA,
        chainRef: 'mainnet-beta',
        toAddress: 'SoLADDR',
        contractAddress: 'MINT',
        amountRaw: '25000000',
        decimals: 6,
      }),
    ).toBe('solana:SoLADDR?amount=25&spl-token=MINT');
  });

  it('trims trailing zeros without losing precision', () => {
    const params = {
      namespace: CHAIN_NAMESPACE_ENUM.BIP122,
      chainRef: 'mainnet',
      toAddress: 'bc1q',
      decimals: 8,
    };
    expect(buildPaymentUri({ ...params, amountRaw: '100000' })).toBe(
      'bitcoin:bc1q?amount=0.001',
    );
    // One satoshi — the case a naive divide-by-1e8 would render as 1e-8.
    expect(buildPaymentUri({ ...params, amountRaw: '1' })).toBe(
      'bitcoin:bc1q?amount=0.00000001',
    );
  });

  it('omits the amount when the request has none', () => {
    expect(
      buildPaymentUri({
        namespace: CHAIN_NAMESPACE_ENUM.TRON,
        chainRef: 'mainnet',
        toAddress: 'TXYZ',
        decimals: 6,
      }),
    ).toBe('tron:TXYZ');
  });
});

describe('checkUserNameShape', () => {
  it.each([
    ['aryaman', true],
    ['Aryaman', true],
    ['a-b-c', true],
    ['ab', false],
    ['a--b', false],
    ['ab-', false],
    ['-ab', false],
    ['a_b', false],
    ['a'.repeat(31), false],
  ])('%s → %s', (input, valid) => {
    expect(checkUserNameShape(input).valid).toBe(valid);
  });

  it('normalises before validating, so case never blocks a claim', () => {
    expect(normaliseUserName('  Aryaman  ')).toBe('aryaman');
  });
});
