/**
 * M10 — pre-start migration guard. Called at the top of bootstrap so the app
 * never touches the database with a stale schema.
 *
 * Set IGNORE_MIGRATIONS=true in the env file to bypass — never in production.
 */

import {
  createMigrationDataSource,
  getPendingMigrations,
} from './migration.utils';

export async function assertMigrationsUpToDate(): Promise<void> {
  if (process.env.IGNORE_MIGRATIONS === 'true') {
    console.warn(
      '[migrations] IGNORE_MIGRATIONS=true — skipping migration check. ' +
        'Do NOT use this in production.',
    );
    return;
  }

  const dataSource = createMigrationDataSource();
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.connect();

  try {
    const pending = await getPendingMigrations(qr);

    if (pending.length > 0) {
      console.error('\n[migrations] Unapplied migrations detected:');
      for (const f of pending) console.error(`  - ${f}`);
      console.error(
        '\nRun "yarn migrate" (or "make migrate") before starting the app.\n',
      );
      process.exit(1);
    }
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}
