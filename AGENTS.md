# Repository Agent Instructions

## Coding style

- Avoid excessive use of comments. Comment the *why*, never the *what*.

## Code Rulebook

Before generating, editing, or reviewing code, read `docs/CODE_RULEBOOK.md` and
follow every applicable rule. Key non-negotiables:

- **Naming**: `PascalCase` for classes, interfaces, DB tables, DB columns, and
  entity properties. `camelCase` for functions, variables, and DTO properties.
  `SCREAMING_SNAKE_CASE` for enum declarations. `kebab-case` for file names and
  enum string values. `snake_case` for PostgreSQL enum type names. Index names
  use `IX_` / `UQ_` prefix + `PascalCase` remainder.
- **Controllers**: every handler uses the four-variable response pattern
  (`resStatus`, `resMessage`, `resData`, `resSuccess`), a single
  `makeResponse(...)` call at the end, and all service calls wrapped in
  `Promisify<T>` with an explicit type argument.
- **Services**: every async method returns `Promise<ResultWithError>`, never
  throws to the caller, and wraps all repo calls in `Promisify<T>` with an
  explicit type argument.
- **Repo services**: exactly `get`, `getAll`, `create`, `update`, `delete`,
  `count`. No custom query methods — composition belongs in feature services.
- **Modules**: every feature module implements `NestModule`, applies
  `LoggerMiddleware`, and imports `RepoModule` for DB access.
- **Migrations**: `synchronize` is disabled; all schema changes go through
  migration files in `apps/api/src/db/migrations/`.
- **Amounts**: token amounts are base-unit strings computed with
  `bignumber.js`. A `number` in an amount path is a bug.

## Architecture

`docs/ARCHITECTURE.md` is the design of record. Two invariants that constrain
almost every change:

1. **One build, any domain.** Anything domain-specific belongs in
   `core.Domains`, not in code. No component hardcodes a colour, a brand name,
   or a hostname.
2. **Config lives in the database.** `.env` holds only Postgres credentials,
   `AES_ENCRYPTION_KEY`, and Redis. Everything else is a `core.PlatformConfig`
   row. Any PR touching a key must update `docs/PLATFORM_CONFIG_KEYS.md`
   (rule PC1).

## Secrets

- `AES_ENCRYPTION_KEY` decrypts every secret in the database. It must never
  appear in the database, in git, or in a log line.
- Never seed a real secret value (PC8) — seed a placeholder.
- Never log an OTP code, a signature, or a config value. `redactSensitive` in
  `common/helpers/redact.helper.ts` covers request bodies automatically.

## Frontend

Design work goes through the `ui-ux-pro-max` skill in `.claude/skills/`. Run
its `scripts/search.py` with `--design-system` for overall direction, then
per-domain queries for individual screens. The pay page is a trust surface:
accessibility and touch-target rules are not optional.

## Licence

FSL-1.1-ALv2 — source-available, **not** open source. Never describe the
project as open source in code comments, docs, README, or UI copy. The correct
phrase is "source-available".
