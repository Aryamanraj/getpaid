import * as path from 'node:path';
import * as fs from 'node:fs';
import type { QueryRunner } from 'typeorm';

export interface PlatformConfigFlags {
  isSecret?: boolean;
  isPublic?: boolean;
}

/**
 * PC2/PC3 — the only permitted way for a seed to write a core.PlatformConfig
 * row. Raw INSERT … ON CONFLICT is forbidden.
 *
 * Conflict resolution (PC5):
 *   - row missing                          → insert
 *   - row exists, SeedUpdatedAt IS NULL    → skip (human-owned)
 *   - row exists, SeedUpdatedAt >= seedTs  → skip (same or newer seed won)
 *   - row exists, SeedUpdatedAt <  seedTs  → update
 *
 * PC8 — never pass a real secret value here. Seed secrets with a placeholder
 * and write the live value through the admin API at deploy time.
 */
export async function upsertPlatformConfig(
  qr: QueryRunner,
  seedFileTimestampMs: number,
  key: string,
  value: unknown,
  description?: string,
  cacheTtlSeconds?: number,
  flags: PlatformConfigFlags = {},
): Promise<'inserted' | 'updated' | 'skipped'> {
  const isSecret = flags.isSecret ?? false;
  const isPublic = flags.isPublic ?? false;

  if (isSecret && isPublic) {
    throw new Error(
      `PC9 violation — PlatformConfig key "${key}" cannot be both secret and public`,
    );
  }

  const existing: { SeedUpdatedAt: string | null }[] = await qr.query(
    `SELECT "SeedUpdatedAt" FROM core."PlatformConfig" WHERE "Key" = $1`,
    [key],
  );

  if (existing.length === 0) {
    await qr.query(
      `INSERT INTO core."PlatformConfig"
         ("Key", "Value", "Description", "IsSecret", "IsPublic", "CacheTtlSeconds", "SeedUpdatedAt")
       VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7)`,
      [
        key,
        JSON.stringify(value),
        description ?? null,
        isSecret,
        isPublic,
        cacheTtlSeconds ?? null,
        seedFileTimestampMs,
      ],
    );
    return 'inserted';
  }

  const existingTs = existing[0].SeedUpdatedAt;
  if (existingTs === null) return 'skipped'; // PC7 — human-owned
  if (Number(existingTs) >= seedFileTimestampMs) return 'skipped';

  await qr.query(
    `UPDATE core."PlatformConfig"
       SET "Value"           = $2::jsonb,
           "Description"     = $3,
           "IsSecret"        = $4,
           "IsPublic"        = $5,
           "CacheTtlSeconds" = COALESCE($6, "CacheTtlSeconds"),
           "SeedUpdatedAt"   = $7
     WHERE "Key" = $1`,
    [
      key,
      JSON.stringify(value),
      description ?? null,
      isSecret,
      isPublic,
      cacheTtlSeconds ?? null,
      seedFileTimestampMs,
    ],
  );
  return 'updated';
}

// ─── Seed runner ─────────────────────────────────────────────────────────────

export const SEEDS_TABLE = '_seeds';
export const SEEDS_DIR = path.join(__dirname);

export async function ensureSeedsTable(qr: QueryRunner): Promise<void> {
  await qr.query(`
    CREATE TABLE IF NOT EXISTS "${SEEDS_TABLE}" (
      "SeedID" SERIAL       PRIMARY KEY,
      "Name"   VARCHAR(255) NOT NULL UNIQUE,
      "RunAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
}

export async function getAppliedSeeds(qr: QueryRunner): Promise<Set<string>> {
  const rows: { Name: string }[] = await qr.query(
    `SELECT "Name" FROM "${SEEDS_TABLE}" ORDER BY "Name"`,
  );
  return new Set(rows.map((row) => row.Name));
}

export function discoverSeedFiles(): string[] {
  if (!fs.existsSync(SEEDS_DIR)) return [];

  const names = fs
    .readdirSync(SEEDS_DIR)
    .filter(
      (f) =>
        !f.startsWith('seed.') &&
        ((f.endsWith('.ts') && !f.endsWith('.d.ts')) || f.endsWith('.js')),
    )
    .map((f) => (f.endsWith('.js') ? `${f.slice(0, -3)}.ts` : f));

  return [...new Set(names)].sort();
}

export async function loadSeedFile(
  file: string,
): Promise<(qr: QueryRunner) => Promise<void>> {
  const tsPath = path.join(SEEDS_DIR, file);
  const jsPath = `${tsPath.slice(0, -3)}.js`;
  const resolved = fs.existsSync(tsPath) ? tsPath : jsPath;
  const mod = await import(resolved);
  const fn = mod.default;
  if (typeof fn !== 'function') {
    throw new Error(`Seed file "${file}" must export a default async function`);
  }
  return fn;
}

export async function runPendingSeeds(qr: QueryRunner): Promise<void> {
  await ensureSeedsTable(qr);
  const applied = await getAppliedSeeds(qr);
  const pending = discoverSeedFiles().filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('No pending seeds — database is up to date.');
    return;
  }

  console.log(`Found ${pending.length} pending seed(s):\n`);

  for (const file of pending) {
    console.log(`  → ${file}`);
    const seed = await loadSeedFile(file);

    await qr.startTransaction();
    try {
      await seed(qr);
      await qr.query(`INSERT INTO "${SEEDS_TABLE}" ("Name") VALUES ($1)`, [
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

  console.log('\nAll seeds applied successfully.');
}
