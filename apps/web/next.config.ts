import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@recv/shared'],
  webpack: (config) => {
    // Solana and wallet libraries reach for Node built-ins that have no
    // browser equivalent; they are optional at runtime.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    // wagmi's connector barrel drags in Coinbase's CDP SDK, which imports
    // optional x402 packages we neither install nor use (we only ship the
    // injected connector). Resolve them to empty modules.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@coinbase/cdp-sdk': false,
      '@x402/core/client': false,
      '@x402/evm/exact/client': false,
      '@x402/evm/upto/client': false,
    };
    return config;
  },
};

export default nextConfig;
