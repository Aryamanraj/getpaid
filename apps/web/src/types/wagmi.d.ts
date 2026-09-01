import type { wagmiConfig } from '@/lib/wallets';

/**
 * Registers our config so wagmi hooks infer chains and connectors from it.
 * Without this the hooks fall back to loose types that demand `account` and
 * `chain` on every call.
 */
declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
