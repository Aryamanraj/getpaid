/**
 * Migration runner — executed via `yarn migrate` / `make migrate`.
 *
 * Conventions (docs/CODE_RULEBOOK.md, M1–M10):
 *  - Migration files live in src/db/migrations/
 *  - File names: {UNIX_MS}-kebab-case.ts (sort order == run order)
 *  - Each file exports a default class implementing MigrationInterface
 *  - Every up/down runs inside a single transaction and is recorded in
 *    "_migrations" — already-applied migrations are skipped
 *  - Use TypeORM's QueryRunner API for DDL; queryRunner.query() only for
 *    PostgreSQL-specific constructs (enum types, CHECK constraints)
 *
 * Pass `--rollback` to roll back the last applied migration.
 */

import * as path from 'node:path';
import * as dotenv from 'dotenv';
import type { QueryRunner } from 'typeorm';
import {
  MIGRATIONS_TABLE,
  createMigrationDataSource,
  discoverMigrationFiles,
  ensureMigrationsTable,
  getAppliedMigrations,
  loadMigration,
} from './migration.utils';
import { runPendingSeeds } from './seed/seed.utils';

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.join(__dirname, '..', '..', 'env', `.env.${env}`) });

async function runPendingMigrations(qr: QueryRunner): Promise<void> {
  await ensureMigrationsTable(qr);
  const applied = await getAppliedMigrations(qr);
  const pending = discoverMigrationFiles().filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('No pending migrations — database is up to date.');
    return;
  }

  console.log(`Found ${pending.length} pending migration(s):\n`);

  for (const file of pending) {
    console.log(`  → ${file}`);
    const migration = await loadMigration(file);

    await qr.startTransaction();
    try {
      await migration.up(qr);
      await qr.query(`INSERT INTO "${MIGRATIONS_TABLE}" ("Name") VALUES ($1)`, [
        file,
      ]);
      await qr.commitTransaction();
      console.log(`  ✓ Applied ${file}`);
    } catch (err) {
      await qr.rollbackTransaction();
      console.error(`  ✗ Failed on ${file} — rolled back.`);
      throw err;
    }
  }

  console.log('\nAll migrations applied successfully.');
}

async function rollbackLastMigration(qr: QueryRunner): Promise<void> {
  await ensureMigrationsTable(qr);
  const rows: { Name: string }[] = await qr.query(
    `SELECT "Name" FROM "${MIGRATIONS_TABLE}" ORDER BY "Name" DESC LIMIT 1`,
  );

  if (rows.length === 0) {
    console.log('Nothing to roll back — no migrations have been applied.');
    return;
  }

  const { Name: file } = rows[0];
  console.log(`Rolling back: ${file}`);
  const migration = await loadMigration(file);

  await qr.startTransaction();
  try {
    await migration.down(qr);
    await qr.query(`DELETE FROM "${MIGRATIONS_TABLE}" WHERE "Name" = $1`, [
      file,
    ]);
    await qr.commitTransaction();
    console.log(`✓ Rolled back ${file}`);
  } catch (err) {
    await qr.rollbackTransaction();
    console.error(`✗ Rollback failed for ${file} — state unchanged.`);
    throw err;
  }
}

async function main(): Promise<void> {
  const dataSource = createMigrationDataSource();
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.connect();

  const isRollback = process.argv.includes('--rollback');

  try {
    if (isRollback) {
      await rollbackLastMigration(qr);
    } else {
      await runPendingMigrations(qr);
      console.log();
      await runPendingSeeds(qr);
    }
  } catch (err) {
    console.error('\nMigration error:', err);
    process.exit(1);
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

main();
