import { CHAIN_NAMESPACE_ENUM } from './enums';

export interface PaymentUriParams {
  namespace: CHAIN_NAMESPACE_ENUM;
  chainRef: string;
  toAddress: string;
  amountRaw?: string;
  decimals: number;
  contractAddress?: string;
}

function toDecimalString(amountRaw: string, decimals: number): string {
  const negative = amountRaw.startsWith('-');
  const digits = (negative ? amountRaw.slice(1) : amountRaw).padStart(
    decimals + 1,
    '0',
  );
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals > 0 ? digits.slice(digits.length - decimals) : '';
  const trimmed = fraction.replace(/0+$/, '');
  const value = trimmed ? `${whole}.${trimmed}` : whole;
  return negative ? `-${value}` : value;
}

/**
 * Chain-native payment URI for QR codes. Built here rather than in either app
 * so the API and the web app can never disagree about what a QR encodes.
 *
 * Tron wallets handle URIs inconsistently, so callers should render the bare
 * address alongside the QR for that namespace.
 */
export function buildPaymentUri(params: PaymentUriParams): string {
  const { namespace, chainRef, toAddress, amountRaw, decimals } = params;
  const contract = params.contractAddress;

  switch (namespace) {
    case CHAIN_NAMESPACE_ENUM.EIP155: {
      if (contract) {
        const base = `ethereum:${contract}@${chainRef}/transfer?address=${toAddress}`;
        return amountRaw ? `${base}&uint256=${amountRaw}` : base;
      }
      const base = `ethereum:${toAddress}@${chainRef}`;
      return amountRaw ? `${base}?value=${amountRaw}` : base;
    }

    case CHAIN_NAMESPACE_ENUM.SOLANA: {
      const query: string[] = [];
      if (amountRaw)
        query.push(`amount=${toDecimalString(amountRaw, decimals)}`);
      if (contract) query.push(`spl-token=${contract}`);
      const suffix = query.length ? `?${query.join('&')}` : '';
      return `solana:${toAddress}${suffix}`;
    }

    case CHAIN_NAMESPACE_ENUM.BIP122: {
      const suffix = amountRaw
        ? `?amount=${toDecimalString(amountRaw, decimals)}`
        : '';
      return `bitcoin:${toAddress}${suffix}`;
    }

    case CHAIN_NAMESPACE_ENUM.TRON: {
      const suffix = amountRaw
        ? `?amount=${toDecimalString(amountRaw, decimals)}`
        : '';
      return `tron:${toAddress}${suffix}`;
    }

    default:
      return toAddress;
  }
}

export { toDecimalString };
