import type { QueryRunner } from 'typeorm';
import { upsertPlatformConfig } from './seed.utils';

const SEED_TS = 1788270000000;

/**
 * IndexNow key, served by the website at /indexnow.txt so engines can verify
 * pings the newsmith pipeline sends on publish. Public by nature — the
 * protocol requires the key to be fetchable. Empty disables the route.
 */
export default async function seed(qr: QueryRunner): Promise<void> {
  await upsertPlatformConfig(
    qr,
    SEED_TS,
    'blog.indexNowKey',
    '',
    'IndexNow key served at /indexnow.txt. Empty = off',
    null,
    { isPublic: true },
  );
}
