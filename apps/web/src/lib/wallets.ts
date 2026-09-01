'use client';

import { http, createConfig } from 'wagmi';
import { arbitrum, base, mainnet, polygon } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

/**
 * Injected connectors only — no WalletConnect relay, so no project id to
 * leak and no third-party modal. Covers MetaMask, Rabby, Coinbase Wallet
 * extension, Brave, and every EIP-6963 wallet.
 */
export const wagmiConfig = createConfig({
  chains: [mainnet, base, arbitrum, polygon],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
  },
  ssr: true,
});

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;
