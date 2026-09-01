/**
 * Shared migration utilities used by both migrate.ts (the CLI runner) and
 * app.ts (the pre-start drift check).
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export const MIGRATIONS_TABLE = '_migrations';
export const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export function createMigrationDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl:
      process.env.POSTGRES_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
  });
}

export async function ensureMigrationsTable(qr: QueryRunner): Promise<void> {
  await qr.query(`
    CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
      "MigrationID" SERIAL       PRIMARY KEY,
      "Name"        VARCHAR(255) NOT NULL UNIQUE,
      "RunAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
}

export async function getAppliedMigrations(
  qr: QueryRunner,
): Promise<Set<string>> {
  const rows: { Name: string }[] = await qr.query(
    `SELECT "Name" FROM "${MIGRATIONS_TABLE}" ORDER BY "Name"`,
  );
  return new Set(rows.map((r) => r.Name));
}

/** Lexicographic order equals chronological order, thanks to the unix-ms prefix. */
export function discoverMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];

  const names = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(
      (f) => (f.endsWith('.ts') && !f.endsWith('.d.ts')) || f.endsWith('.js'),
    )
    // A compiled .js and its .ts source are the same migration.
    .map((f) => (f.endsWith('.js') ? `${f.slice(0, -3)}.ts` : f));

  return [...new Set(names)].sort();
}

export async function loadMigration(file: string): Promise<MigrationInterface> {
  const tsPath = path.join(MIGRATIONS_DIR, file);
  const jsPath = `${tsPath.slice(0, -3)}.js`;
  const resolved = fs.existsSync(tsPath) ? tsPath : jsPath;
  const mod = await import(resolved);
  const MigrationClass: new () => MigrationInterface =
    mod.default ?? Object.values(mod).find((v) => typeof v === 'function');
  if (!MigrationClass) {
    throw new Error(
      `Migration "${file}" must export a default class implementing MigrationInterface`,
    );
  }
  return new MigrationClass();
}

export async function getPendingMigrations(qr: QueryRunner): Promise<string[]> {
  await ensureMigrationsTable(qr);
  const applied = await getAppliedMigrations(qr);
  return discoverMigrationFiles().filter((f) => !applied.has(f));
}
