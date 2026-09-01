# Code Rulebook

Ported from `closer-protocol-indexer`. Every rule is retained; only the Anchor
event-decoding section is dropped (no on-chain program here) and the examples
are restated against this project's entities. Rule IDs are unchanged, so they
still map back to the reference repo.

---

## TypeScript Compiler Settings

`strictNullChecks` is **disabled** (`tsconfig.json`). This is intentional — it
keeps code readable without forcing `| null | undefined` noise throughout the
codebase.

**Rules that follow from this:**
- Do **not** write `string | null`, `number | null`, `T | undefined` in type
  annotations — the compiler does not require it and it adds clutter
- Use `?` on optional parameters and properties (`domainID?: number`) — this is
  sufficient and idiomatic
- Use `?` on optional chaining (`user?.UserName`) for safe access as needed
- Do **not** add `!` non-null assertions — if a value could be missing, handle
  it with a conditional or `??`

```ts
// ✅ Correct
domainID?: number;
getProfile({ userName, domainID }: { userName: string; domainID?: number })

// ❌ Wrong — verbose, not required by compiler, adds noise
domainID?: number | null;
getProfile({ ... domainID: number | null })
```

---

## Naming Conventions

### TypeScript source files

| Artefact | Case | Example |
|---|---|---|
| Class | `PascalCase` | `PaymentRepoService`, `UserAuthGuard`, `GenericError` |
| Interface | `PascalCase` | `ResultWithError`, `JwtPayload`, `NormalisedTransfer` |
| Type alias | `PascalCase` | `JSONArray` |
| Enum (declaration) | `SCREAMING_SNAKE_CASE` | `PAYMENT_REQUEST_STATUS_ENUM`, `CHAIN_NAMESPACE_ENUM` |
| Enum member (key) | `SCREAMING_SNAKE_CASE` | `CONFIRMED`, `CRYPTO_ADDRESS` |
| Enum member (value) | `kebab-case` | `'confirmed'`, `'crypto-address'` |
| Constant object | `PascalCase` | `QueueNames`, `BucketSizes` |
| Function / method | `camelCase` | `makeResponse`, `getByUserName` |
| Utility function (exported helper) | `PascalCase` | `Promisify` |
| Variable / parameter | `camelCase` | `resStatus`, `queryRunner`, `entityManager` |
| Class property (non-entity) | `camelCase` | `this.logger`, `this.paymentRepo` |
| DTO property | `camelCase` | `userName`, `txHash`, `amountRaw` |

### File names

| Artefact | Pattern | Example |
|---|---|---|
| Entity file | `kebab-case.entity.ts` | `payment-request.entity.ts` |
| Repo service | `kebab-case-repo.service.ts` | `payment-request-repo.service.ts` |
| Feature service | `kebab-case.service.ts` | `payment.service.ts` |
| Controller | `kebab-case.controller.ts` | `payment.controller.ts` |
| Module | `kebab-case.module.ts` | `repo.module.ts` |
| DTO | `kebab-case.dto.ts` | `create-payment-request.dto.ts` |
| Guard | `kebab-case.guard.ts` | `user-auth.guard.ts` |
| Middleware | `kebab-case.middleware.ts` | `logger.middleware.ts` |
| Decorator | `kebab-case.decorator.ts` | `apiOkResponse.decorator.ts` |
| Error class | `PascalCase.error.ts` | `Generic.error.ts` |
| Constants file | `kebab-case.constants.ts` | `payment.constants.ts` |
| Migration file | `{UNIX_MS}-kebab-case.ts` | `1775253507393-initial-schema.ts` |

### Database — tables and columns

| Artefact | Case | Example |
|---|---|---|
| Schema name | `lowercase` | `core`, `ops` |
| Table name | `PascalCase` | `Users`, `PaymentRequests`, `PayoutAddresses` |
| Column name | `PascalCase` | `UserID`, `CreatedAt`, `IsActive` |
| Primary key | `{Entity}ID` | `UserID`, `PaymentRequestID`, `AssetID` |
| Foreign key column | `{ReferencedEntity}ID` | `UserID`, `ChainID`, `DomainID` |
| Enum type (PostgreSQL) | `snake_case` | `payment_request_status_enum`, `chain_namespace_enum` |
| Index name | `IX_{Table}_{Column(s)}` | `IX_PaymentRequests_PayeeUserID` |
| Unique index name | `UQ_{Table}_{Column(s)}` | `UQ_Users_UserName`, `UQ_PaymentTransactions_ChainID_TxHash` |
| Foreign key constraint | TypeORM auto-generated | do not name manually unless using raw SQL |

### Entity class properties (TypeORM entities only)

Entity properties mirror their column names — always `PascalCase`. This is the
**only** place in TypeScript source where `PascalCase` is used for properties.

```ts
// ✅ Correct — entity properties are PascalCase
@Column() PaymentRequestID: number;
@Column() CreatedAt: Date;
@ManyToOne(() => Asset) Asset: Asset;

// ❌ Wrong — no camelCase in entity properties
@Column() paymentRequestId: number;
```

### Relation properties in entities

The relation property name is the **entity class name**, not the column name.

```ts
// ✅ Correct
@ManyToOne(() => Chain, (c) => c.PaymentRequests)
@JoinColumn({ name: 'ChainID' })   // column = ChainID
Chain: Chain;                      // property = Chain (class name)

// ❌ Wrong
@JoinColumn({ name: 'ChainID' })
chain: Chain;                      // lowercase = wrong in entities
```

### Summary — quick reference by layer

| Layer | Rule |
|---|---|
| TypeScript classes, interfaces, types | `PascalCase` |
| TypeScript functions, methods, variables, params | `camelCase` |
| TypeScript constants/enums (declaration) | `SCREAMING_SNAKE_CASE` |
| Enum values (string) | `kebab-case` |
| DTO properties | `camelCase` |
| Entity properties (columns + relations) | `PascalCase` |
| File names | `kebab-case` (except `Generic.error.ts`) |
| DB table names | `PascalCase` |
| DB column names | `PascalCase` |
| DB schema names | `lowercase` |
| DB enum type names | `snake_case` |
| DB index names | `IX_` / `UQ_` prefix + `PascalCase` remainder |

---

## Migrations

**M1.** Schema changes are managed exclusively by migration files. TypeORM
`synchronize` is permanently disabled.

**M2.** Migrations are TypeScript files in `src/db/migrations/`. Run with
`yarn migrate` or `make migrate`.

**M3.** File naming: `{UNIX_MS}-kebab-case.ts` — e.g.
`1775253507393-initial-schema.ts`. Sort order equals run order.

**M4.** Each file must export a default class implementing `MigrationInterface`
with `up` and `down` methods receiving a `QueryRunner`.

**M5.** Use the TypeORM `QueryRunner` API (`createTable`, `dropTable`,
`addColumn`, `hasTable`, `hasColumn`, etc.) for all DDL. Raw
`queryRunner.query()` is only permitted for PostgreSQL-specific constructs that
have no QueryRunner equivalent (e.g. enum types, `CHECK` constraints).

**M6.** Every `up` must include existence checks before applying changes
(`hasTable`, `hasColumn`, or `DO $$ EXCEPTION WHEN duplicate_object` for enum
types).

**M7.** Every migration must implement a complete `down` that fully reverses
its `up`. Rollback is run with `yarn migrate:rollback` or
`make migrate-rollback`.

**M8.** Each migration runs inside a single transaction. On failure it is
automatically rolled back and the `_migrations` table is not updated.

**M9.** The `_migrations` table tracks applied migrations by filename. A
migration is never run more than once.

**M10.** The app entry point (`app.ts`) calls `assertMigrationsUpToDate()`
before bootstrapping. If unapplied migrations exist the process exits with a
clear error. Set `IGNORE_MIGRATIONS=true` in the env file to bypass this check
— never in production.

---

## Platform Config Keys

**PC1.** `docs/PLATFORM_CONFIG_KEYS.md` is the **single source of truth** for
every key stored in `core.PlatformConfig`. It must be kept up to date. Every PR
that introduces, renames, or removes a key, or changes a seed value, must
update that file.

**PC2.** Every seed file that writes platform config keys must use
`upsertPlatformConfig` from `src/db/seed/seed.utils.ts`. Raw
`INSERT … ON CONFLICT DO NOTHING` is forbidden for platform config rows.

**PC3.** `upsertPlatformConfig` signature:
```typescript
upsertPlatformConfig(
  qr: QueryRunner,
  seedFileTimestampMs: number, // unix-ms prefix of the calling seed file
  key: string,
  value: unknown,
  description?: string,
  cacheTtlSeconds?: number,
  flags?: { isSecret?: boolean; isPublic?: boolean },
): Promise<'inserted' | 'updated' | 'skipped'>
```

**PC4.** The `seedFileTimestampMs` argument must equal the unix-ms prefix of
the calling seed file. Define it as a `const SEED_TS = …` at the top of the
file.

**PC5.** Conflict resolution rules (enforced by `upsertPlatformConfig`):
- Row missing → **insert** with `SeedUpdatedAt = seedFileTimestampMs` and
  `CacheTtlSeconds = cacheTtlSeconds` when provided.
- Row exists, `SeedUpdatedAt = NULL` → **skip** (human-owned row).
- Row exists, `SeedUpdatedAt >= seedFileTimestampMs` → **skip**.
- Row exists, `SeedUpdatedAt < seedFileTimestampMs` → **update** value,
  description, `SeedUpdatedAt`, and `CacheTtlSeconds` when provided.

**PC6.** When the same key is written by two different seed files, the file
with the higher unix-ms prefix wins. Seeds always run oldest → newest.

**PC7.** To protect a row from all future seed overwrites (i.e. mark it as
human-owned), set `SeedUpdatedAt = NULL` via SQL or the admin API.
`upsertPlatformConfig` will then permanently skip that row.

**PC8.** *(new)* Never seed a real secret value. A key with `IsSecret = true`
is seeded with a placeholder; the live value is written through the admin API
or SQL at deploy time. Secrets must not appear in git.

**PC9.** *(new)* A key can never be both `IsSecret` and `IsPublic`. This is
enforced by a `CHECK` constraint as well as by the service layer.

---

## Commit Messages

We follow the **Conventional Commits** specification: `<type>(<scope>): <subject>`

**Types:**

| Type | When to use |
|---|---|
| `feat` | New feature or behaviour |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Tooling, config, dependency, or build changes with no production code impact |
| `docs` | Documentation only changes |
| `test` | Adding or updating tests |
| `perf` | Performance improvements |
| `revert` | Reverting a previous commit |

**Scopes** (use the module/folder name being touched):

`auth` · `user` · `payment` · `payment-method` · `chain` · `domain` ·
`platform-config` · `queue` · `repo` · `db` · `migration` · `admin` ·
`common` · `web` · `shared` · `config` · `env` · `deps` · `make`

**Rules:**

**C1.** Subject is lowercase, imperative mood, no trailing period — e.g.
`feat(chain): add tron trc-20 verifier`.

**C2.** Scope is required and must match the primary module or concern changed.

**C3.** Keep the subject line under 72 characters.

**C4.** Use a blank line followed by a body paragraph for any non-obvious
context or breaking-change notes.

**C5.** Breaking changes must add `!` after the scope — e.g.
`feat(db)!: rename PaymentRequests columns` — and describe the break in the
commit body.

---

## Controllers

**CT1.** Every handler method uses the four-variable response pattern declared
at the top of the `try/catch` block:

```ts
let resStatus = HttpStatus.OK;
let resMessage = 'Action description';
let resData = null;
let resSuccess = true;
```

**CT2.** Service calls inside a handler are always wrapped in `Promisify<T>`
with an explicit type argument — never called directly with `await`:

```ts
const result = await Promisify<PaymentRequest>(
  this.paymentService.createRequest(data),
);
resData = result;
```

**CT3.** The `catch` block must: log the error with `this.logger.error(...)`
including relevant context, set `resStatus` from
`error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR`, set `resSuccess = false`,
and set a descriptive `resMessage`.

**CT4.** Every handler ends with exactly one
`makeResponse(res, resStatus, resSuccess, resMessage, resData)` call — no early
returns, no multiple `makeResponse` calls per handler.

**CT5.** Every handler declares `@Res() res: Response` as a parameter and does
not use `@Res({ passthrough: true })`.

**CT6.** All Swagger decorators (`@ApiOperation`, `@ApiOkResponseGeneric`,
`@ApiBadRequestResponse`, and `@ApiBearerAuth` for guarded routes) are required
on every handler.

**CT6a.** `@ApiBearerAuth` must use one of the fixed scheme names that match
the Swagger setup — never `'Bearer'` or any other ad-hoc string:

| Guard | `@ApiBearerAuth` value |
|---|---|
| `UserAuthGuard` (JWT) | `'JWT-auth'` |
| `AdminAuthGuard` (x-api-key) | `'Api-auth'` |

**CT7.** Guards are applied per-handler with `@UseGuards(...)`, not at the
controller class level, so unprotected endpoints in the same controller stay
public. The pay page and receipt endpoints are public by design — this rule is
load-bearing here.

### Controller Template

```ts
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';

@Controller('resource')
@ApiTags('Resource')
export class ResourceController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private resourceService: ResourceService,
  ) {}

  @Get('getOne/:id')
  // @UseGuards(UserAuthGuard)       // add for protected routes
  // @ApiBearerAuth('JWT-auth')      // add for protected routes
  @ApiOperation({ summary: 'Get one resource by id' })
  @ApiOkResponseGeneric({
    description: 'Fetched resource',
    type: SomeEntity,
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to fetch resource' })
  async getOne(@Param('id') id: string, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched resource';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<SomeEntity>(
        this.resourceService.getOne(id),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in fetching resource [id: ${id}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch resource: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}
```

**CT8.** *(new)* Never log a request body that can contain a secret or a
credential — OTP codes, signatures, and PlatformConfig secret values are
redacted before they reach `this.logger`.

---

## Repo Services

**RS1.** Every repo service exposes exactly these methods: `get`, `getAll`,
`create`, `update`, `delete`, and `count`. No additional query methods are
permitted on a repo service. Repo services are pure data-access wrappers; all
business logic and query composition belong in feature services.

**RS2.** All database queries use the TypeORM ORM API (`find`, `findOne`,
`count`, `save`, `update`, `delete`) or TypeORM's `FindOptionsWhere` operators
(`Raw`, `Between`, `MoreThan`, `ILike`, `In`, `Not`, etc.). Raw SQL via
`entityManager.query()` is forbidden except inside `entityManager.transaction()`
callbacks for PostgreSQL-specific constructs with no TypeORM equivalent
(mirrors M5).

**RS3.** Complex filtering conditions that cannot be expressed with standard
TypeORM operators belong in the feature service. Use TypeORM's `Raw()` operator
in `FindOptionsWhere` to express per-row arithmetic or multi-column
comparisons.

```ts
// ✅ Correct — complex condition in the feature service via Raw(),
//              calls the standard repo.getAll()
const where: FindOptionsWhere<PaymentRequest> = {
  Status: PAYMENT_REQUEST_STATUS_ENUM.PENDING,
  ExpiresAt: Raw((alias) => `${alias} < NOW()`),
};
const expired = await Promisify<PaymentRequest[]>(
  this.paymentRequestRepo.getAll({ where, relations: { Asset: true } }, false),
);

// ❌ Wrong — custom query method added to the repo service
async getExpiredRequests(): Promise<ResultWithError> { ... }
```

**RS4.** Operations that require atomicity across multiple writes must use
`entityManager.transaction()` directly in the feature service. Inside the
callback, use the scoped `transactionManager` — not the repo service methods —
for every operation (mirrors SV11).

---

## Services

**SV1.** Every service method that performs async work returns
`Promise<ResultWithError>`. No service method returns a raw entity type or
throws to the caller.

**SV2.** The `ResultWithError` contract is always satisfied by both branches:
- Success: `return { data: <result>, error: null }`
- Failure: `return { data: null, error }` (never re-throw)

**SV3.** Every call to a method that returns `Promise<ResultWithError>` —
whether a repo call, another service method, or a private helper — must be
wrapped in `Promisify<T>` with an explicit type argument. `Promisify` unwraps
the `data` field on success and throws the `error` on failure, keeping callers
free of manual `if (error)` branches:

```ts
// Repo call
const user = await Promisify<User>(
  this.userRepo.get({ where: { UserName: userName } }),
);

// Calling another service method
const rpcUrls = await Promisify<string[]>(
  this.platformConfigService.getConfigByKey('chain.eip155.8453.rpcUrls'),
);

// Calling a private helper that also returns Promise<ResultWithError>
const transfer = await Promisify<NormalisedTransfer>(
  this.fetchTransfer(txHash),
);
```

Private helper methods are **not** exempt — if they perform async work they
must also return `Promise<ResultWithError>` and be called via `Promisify<T>`.

**SV4.** Every service method opens with a structured info log:

```ts
this.logger.info(
  `[PaymentService.createRequest] creating request for payee: ${userName}`,
);
```

**SV5.** Every `catch` block logs a structured error with stack trace before
returning the error branch:

```ts
this.logger.error(
  `[PaymentService.createRequest] Error creating request: ${userName}, error: ${error.stack}`,
);
return { data: null, error };
```

**SV6.** `Promisify<T>` must always include the explicit generic type —
`Promisify<User>(...)`, never `Promisify(...)`. This applies everywhere in both
controllers and services.

**SV7.** **Never assign a relation property using a partial stub object
(`{ SomeID: id } as any`).** TypeORM's `save()` requires real entity instances
— stub objects will fail silently or throw at runtime. Always fetch the related
entity via its repo service before assigning it:

```ts
// ✅ Correct — fetch the entity, then assign
const asset = await Promisify<Asset>(
  this.assetRepo.get({ where: { AssetID: dto.assetId } }),
);
request.Asset = asset;

// ❌ Wrong — stub object bypasses TypeORM and fails at runtime
request.Asset = { AssetID: dto.assetId } as any;
```

**SV8.** **Never pass relation changes to `repo.update()`.** TypeORM's
`Repository.update()` only updates direct scalar columns. When an update
includes changing a relation (FK), load the entity first, assign the fetched
related entity, then save with `repo.create(entity)`:

```ts
// ✅ Correct — load → fetch relation → save
const accepted = await Promisify<AcceptedAsset>(
  this.acceptedAssetRepo.get({
    where: { AcceptedAssetID: id },
    relations: { PayoutAddress: true },
  }),
);
const address = await Promisify<PayoutAddress>(
  this.payoutAddressRepo.get({ where: { PayoutAddressID: dto.payoutAddressId } }),
);
accepted.PayoutAddress = address;
const { data: saved, error } = await this.acceptedAssetRepo.create(accepted);

// ❌ Wrong — update() cannot handle relation changes
await this.acceptedAssetRepo.update({ AcceptedAssetID: id }, {
  PayoutAddress: { PayoutAddressID: dto.payoutAddressId } as any,
});
```

**SV9.** **Always use the object style for `relations` in TypeORM find
options** — never a string array:

```ts
// ✅ Correct — object style
this.paymentRequestRepo.get({
  where: { PublicID: publicId },
  relations: {
    Asset: { Chain: true },
    PayeeUser: true,
    PaymentTransactions: true,
  },
});

// ❌ Wrong — string array style
relations: ['Asset', 'PayeeUser'],

// ❌ Wrong — dot-notation strings for nested relations
relations: ['Asset', 'Asset.Chain'],
```

**SV10.** **Always type dynamic `where` objects as `FindOptionsWhere<Entity>`**
— never as `Record<string, unknown>`. Use dot-property access
(`where.Status = ...`), not string-bracket access (`where['Status'] = ...`).

```ts
// ✅ Correct
import { FindOptionsWhere } from 'typeorm';

const where: FindOptionsWhere<PaymentRequest> = {
  PayeeUser: { UserID: userId },
};
if (filter.status) where.Status = filter.status;

// ❌ Wrong — no type safety, typos compile silently
const where: Record<string, unknown> = { PayeeUser: { UserID: userId } };
if (filter.status) where['Status'] = filter.status;
```

**SV11.** **Wrap all multi-step DB writes in a single
`entityManager.transaction()` call.** Any service method that performs two or
more inserts/updates that must succeed or fail together must use the scoped
`transactionManager` for every operation inside the callback. Never mix `repo`
service calls and `transactionManager` calls inside the same logical unit of
work. Track state via outer `let` variables when the callback must signal
results back to the caller.

```ts
// ✅ Correct — all writes are atomic; result is surfaced via an outer variable
async confirmPayment(publicId: string): Promise<ResultWithError> {
  try {
    let confirmed: PaymentRequest | null = null;

    await this.entityManager.transaction(async (transactionManager) => {
      const request = await transactionManager.findOne(PaymentRequest, {
        where: { PublicID: publicId },
        relations: { Asset: true },
      });
      if (!request) throw new Error(`PaymentRequest ${publicId} not found`);

      request.Status = PAYMENT_REQUEST_STATUS_ENUM.CONFIRMED;
      confirmed = await transactionManager.save(request);

      const tx = transactionManager.create(PaymentTransaction, { ... });
      await transactionManager.save(tx);
    });

    return { data: confirmed, error: null };
  } catch (error) {
    this.logger.error(`[PaymentService.confirmPayment] ${error?.stack}`);
    return { data: null, error };
  }
}

// ❌ Wrong — separate repo calls are not atomic; a failure after the first
//            save leaves a request marked confirmed with no transaction row
const saved = await Promisify<PaymentRequest>(this.paymentRequestRepo.create(request));
await Promisify(this.paymentTransactionRepo.create(txData)); // not rolled back
```

**SV12.** **Use `BucketSizes` for all time durations in milliseconds.** Never
hardcode raw ms literals (`60_000`, `3_600_000`, etc.) — import from
`src/common/constants` and cast with `Number(BucketSizes.ONE_MINUTE)`.

**SV13.** *(new)* **Token amounts are never JavaScript numbers.**
Amounts are held as base-unit strings and computed with `bignumber.js`. A
`number` anywhere in an amount path is a bug, not a style preference.

**SV14.** *(new)* **Every address is validated before it is stored or
compared**, using the checksum rules for its namespace. Address comparison in
verifiers is case-insensitive for EVM and case-sensitive elsewhere.

---

## Modules

**MD1.** Every feature module implements `NestModule` and applies
`LoggerMiddleware` to its controller via `configure()`.

**MD2.** `RepoModule` is imported in every feature module that needs database
access — never import individual repo services directly from outside
`RepoModule`.

**MD3.** Circular dependencies between modules are resolved with
`forwardRef(() => XxxModule)` on both sides of the dependency. Never
restructure module boundaries just to avoid `forwardRef`.

**MD4.** Queue registration uses
`BullModule.registerQueue({ name: QueueNames.XxxName })`. Queue names are
always sourced from the `QueueNames` constant — no inline strings.

**MD5.** Only export from a module what other modules need to inject. Internal
services and helpers that are not consumed outside the module must not appear
in `exports`.

**MD6.** `HttpModule` is imported only in modules whose services make outbound
HTTP calls.

### Module Template

```ts
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  forwardRef,
} from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { LoggerMiddleware } from '../common/middlewares/logger.middleware';
import { ResourceService } from './resource.service';
import { ResourceController } from './resource.controller';
// import { BullModule } from '@nestjs/bull';
// import { QueueNames } from '../common/constants';
// import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    RepoModule,
    // HttpModule,
    // BullModule.registerQueue({ name: QueueNames.VerificationQueue }),
    // forwardRef(() => OtherModule),
  ],
  providers: [ResourceService],
  controllers: [ResourceController],
  exports: [ResourceService],
})
export class ResourceModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(ResourceController);
  }
}
```
