export enum CHAIN_NAMESPACE_ENUM {
  EIP155 = 'eip155',
  SOLANA = 'solana',
  BIP122 = 'bip122',
  TRON = 'tron',
}

export enum AUTH_PROVIDER_ENUM {
  EMAIL = 'email',
  WALLET = 'wallet',
}

export enum PAYMENT_METHOD_TYPE_ENUM {
  CRYPTO_ADDRESS = 'crypto-address',
  UPI = 'upi',
  BANK_TRANSFER = 'bank-transfer',
}

export enum PAYMENT_REQUEST_STATUS_ENUM {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum TX_STATUS_ENUM {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  MISMATCHED = 'mismatched',
}

export enum TX_SUBMISSION_ENUM {
  WALLET = 'wallet',
  MANUAL = 'manual',
}

export enum VERIFICATION_JOB_STATUS_ENUM {
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}
