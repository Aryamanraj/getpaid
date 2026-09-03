import type { QueryRunner } from 'typeorm';
import { upsertPlatformConfig } from './seed.utils';

const SEED_TS = 1788280000000;

/**
 * PostHog web + product analytics. The project key is public by nature (it
 * ships to every browser); empty disables analytics entirely.
 */
export default async function seed(qr: QueryRunner): Promise<void> {
  await upsertPlatformConfig(
    qr,
    SEED_TS,
    'analytics.posthogKey',
    '',
    'PostHog project API key (phc_…). Empty = analytics off',
    null,
    { isPublic: true },
  );
  await upsertPlatformConfig(
    qr,
    SEED_TS,
    'analytics.posthogHost',
    'https://us.i.posthog.com',
    'PostHog ingestion host',
    null,
    { isPublic: true },
  );
}
