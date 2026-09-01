import type { QueryRunner } from 'typeorm';
import { upsertPlatformConfig } from './seed.utils';

const SEED_TS = 1788230100000;

/** Public keys the browser needs to send transactions itself. */
export default async function seed(qr: QueryRunner): Promise<void> {
  await upsertPlatformConfig(
    qr,
    SEED_TS,
    'web.solanaRpcUrl',
    'https://api.mainnet-beta.solana.com',
    'RPC the browser uses to build and send Solana transactions',
    null,
    { isPublic: true },
  );
}
