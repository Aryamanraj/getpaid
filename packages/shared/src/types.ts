import { CHAIN_NAMESPACE_ENUM } from './enums';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface DomainTheme {
  colors?: Record<string, string>;
  fontKey?: string;
  radius?: string;
  defaultMode?: 'light' | 'dark' | 'system';
}

export interface BootstrapDomain {
  host: string;
  brandName: string;
  tagline?: string;
  logoUrl?: string;
  faviconUrl?: string;
  supportEmail?: string;
  theme: DomainTheme;
  socialLinks?: Record<string, string>;
}

export interface BootstrapChain {
  chainId: number;
  namespace: CHAIN_NAMESPACE_ENUM;
  chainRef: string;
  name: string;
  slug: string;
  nativeSymbol: string;
  nativeDecimals: number;
  explorerTxUrlTemplate: string;
}

export interface BootstrapAsset {
  assetId: number;
  chainId: number;
  symbol: string;
  name: string;
  contractAddress?: string;
  decimals: number;
  logoUrl?: string;
  isStablecoin: boolean;
}

export interface BootstrapPayload {
  domain: BootstrapDomain;
  features: Record<string, boolean>;
  publicConfig: Record<string, unknown>;
  chains: BootstrapChain[];
  assets: BootstrapAsset[];
}

/**
 * The shape every chain verifier returns, so the payment service has no
 * per-chain branching. Amounts are base-unit strings, never numbers.
 */
export interface NormalisedTransfer {
  txHash: string;
  from: string;
  to: string;
  contractAddress?: string;
  amountRaw: string;
  blockNumber: number;
  blockTimestamp: number;
  confirmations: number;
  succeeded: boolean;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
}

export interface AuthIdentitySummary {
  authIdentityId: number;
  provider: 'email' | 'wallet';
  identifier: string;
  namespace?: CHAIN_NAMESPACE_ENUM;
  isPrimary: boolean;
  verifiedAt?: string;
}

export interface PresetAmount {
  assetId: number;
  amount: string;
}

export interface MeResponse {
  userId: number;
  userName?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  accentHue?: number;
  presetAmounts?: PresetAmount[];
  domainId: number;
  identities: AuthIdentitySummary[];
  createdAt: string;
}

export interface WalletChallenge {
  nonce: string;
  message: string;
  expiresAt: string;
}

// ─── Public profile (the pay page) ───────────────────────────────────────────

export interface ProfileAcceptedAsset {
  acceptedAssetId: number;
  asset: BootstrapAsset;
  chain: BootstrapChain;
  toAddress: string;
  isProven: boolean;
}

export interface PublicProfile {
  userName: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  accentHue?: number;
  presetAmounts?: PresetAmount[];
  acceptedAssets: ProfileAcceptedAsset[];
}

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentRequestStatus =
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'expired';

export type TransactionStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'mismatched';

export interface PaymentTransactionView {
  txHash: string;
  status: TransactionStatus;
  confirmations: number;
  requiredConfirmations: number;
  mismatchReason?: string;
  explorerUrl: string;
  fromAddress?: string;
  amountRaw?: string;
  blockTimestamp?: string;
  submittedVia: 'wallet' | 'manual';
  verifiedAt?: string;
}

export interface PaymentRequestView {
  publicId: string;
  status: PaymentRequestStatus;
  payee: { userName: string; displayName?: string; avatarUrl?: string };
  asset: BootstrapAsset;
  chain: BootstrapChain;
  toAddress: string;
  amountRaw: string;
  amountDisplay: string;
  note?: string;
  payerName?: string;
  paymentUri: string;
  expiresAt?: string;
  createdAt: string;
  transaction?: PaymentTransactionView;
}
