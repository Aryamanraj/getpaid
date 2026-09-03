import type { QueryRunner } from 'typeorm';
import { upsertPlatformConfig } from './seed.utils';

const SEED_TS = 1788260000000;

/**
 * Which domains have a blog. Articles come from the newsmith pipeline
 * (blogs.articles); the key gates the API endpoints and the web nav link.
 */
export default async function seed(qr: QueryRunner): Promise<void> {
  await upsertPlatformConfig(
    qr,
    SEED_TS,
    'blog.enabledHosts',
    ['recv.to'],
    'Hosts whose /blog is live. Others 404',
    null,
    { isPublic: true },
  );
}
