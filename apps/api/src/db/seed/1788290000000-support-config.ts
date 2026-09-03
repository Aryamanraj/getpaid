import type { QueryRunner } from 'typeorm';
import { upsertPlatformConfig } from './seed.utils';

const SEED_TS = 1788290000000;

/**
 * The operator's own username, linked as "Support" on the landing footer and
 * under blog articles: https://<handle>.<host>. Empty hides the buttons.
 */
export default async function seed(qr: QueryRunner): Promise<void> {
  await upsertPlatformConfig(
    qr,
    SEED_TS,
    'support.handle',
    '',
    'Username whose pay page collects donations. Empty = no Support links',
    null,
    { isPublic: true },
  );
}
