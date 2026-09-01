'use client';

import { useMemo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { wagmiConfig } from '@/lib/wallets';

export function Providers({
  children,
  solanaRpcUrl,
}: {
  children: ReactNode;
  solanaRpcUrl: string;
}) {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ConnectionProvider endpoint={solanaRpcUrl}>
          {/* An empty wallets list means Wallet Standard auto-detection:
              Phantom, Solflare, Backpack and friends register themselves. */}
          <WalletProvider wallets={[]} autoConnect={false}>
            {children}
          </WalletProvider>
        </ConnectionProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
