/**
 * Migration: domain-scoped-accounts
 *
 * Domains become fully separate products. An account, its sign-in identities,
 * and its username all belong to the domain they were created on:
 *
 *   - Users.PreferredDomainID becomes Users.DomainID (NOT NULL): the owning
 *     domain. Existing rows backfill to recv.to (the domain used during
 *     rollout), falling back to the lowest DomainID.
 *   - UserName uniqueness drops from global to per-domain.
 *   - AuthIdentities gains DomainID so the same email or wallet can register
 *     independently on each domain.
 *   - OtpCodes gains DomainID so a code requested on one domain cannot be
 *     consumed on another.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

const BACKFILL_DOMAIN = `COALESCE(
  (SELECT "DomainID" FROM core."Domains" WHERE "Host" = 'recv.to'),
  (SELECT MIN("DomainID") FROM core."Domains")
)`;

export default class DomainScopedAccounts1788240000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Users ──────────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE core."Users" RENAME COLUMN "PreferredDomainID" TO "DomainID"`,
    );
    await queryRunner.query(
      `UPDATE core."Users" SET "DomainID" = ${BACKFILL_DOMAIN} WHERE "DomainID" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE core."Users" ALTER COLUMN "DomainID" SET NOT NULL`,
    );
    // IF EXISTS: the username-nullable migration's changeColumn dropped this
    // index as a side effect, so live databases no longer have it.
    await queryRunner.query(`DROP INDEX IF EXISTS core."UQ_Users_UserName"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_Users_DomainID_UserName" ON core."Users" ("DomainID", "UserName")`,
    );

    // ── AuthIdentities ─────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE core."AuthIdentities" ADD COLUMN "DomainID" int`,
    );
    await queryRunner.query(
      `UPDATE core."AuthIdentities" ai SET "DomainID" = u."DomainID"
         FROM core."Users" u WHERE u."UserID" = ai."UserID"`,
    );
    await queryRunner.query(
      `ALTER TABLE core."AuthIdentities" ALTER COLUMN "DomainID" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE core."AuthIdentities"
         ADD CONSTRAINT "FK_AuthIdentities_DomainID"
         FOREIGN KEY ("DomainID") REFERENCES core."Domains" ("DomainID")`,
    );
    await queryRunner.query(
      `DROP INDEX core."UQ_AuthIdentities_Provider_Identifier"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_AuthIdentities_DomainID_Provider_Identifier"
         ON core."AuthIdentities" ("DomainID", "Provider", "Identifier")`,
    );

    // ── OtpCodes ───────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE core."OtpCodes" ADD COLUMN "DomainID" int`,
    );
    await queryRunner.query(
      `UPDATE core."OtpCodes" SET "DomainID" = ${BACKFILL_DOMAIN} WHERE "DomainID" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE core."OtpCodes" ALTER COLUMN "DomainID" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE core."OtpCodes"
         ADD CONSTRAINT "FK_OtpCodes_DomainID"
         FOREIGN KEY ("DomainID") REFERENCES core."Domains" ("DomainID")`,
    );
    await queryRunner.query(`DROP INDEX core."IX_OtpCodes_Email_ExpiresAt"`);
    await queryRunner.query(
      `CREATE INDEX "IX_OtpCodes_DomainID_Email_ExpiresAt"
         ON core."OtpCodes" ("DomainID", "Email", "ExpiresAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restoring the global unique index fails loudly if the same name now
    // exists on two domains — that collision has no automatic resolution.
    await queryRunner.query(
      `DROP INDEX core."IX_OtpCodes_DomainID_Email_ExpiresAt"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IX_OtpCodes_Email_ExpiresAt" ON core."OtpCodes" ("Email", "ExpiresAt")`,
    );
    await queryRunner.query(
      `ALTER TABLE core."OtpCodes" DROP CONSTRAINT "FK_OtpCodes_DomainID"`,
    );
    await queryRunner.query(
      `ALTER TABLE core."OtpCodes" DROP COLUMN "DomainID"`,
    );

    await queryRunner.query(
      `DROP INDEX core."UQ_AuthIdentities_DomainID_Provider_Identifier"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_AuthIdentities_Provider_Identifier"
         ON core."AuthIdentities" ("Provider", "Identifier")`,
    );
    await queryRunner.query(
      `ALTER TABLE core."AuthIdentities" DROP CONSTRAINT "FK_AuthIdentities_DomainID"`,
    );
    await queryRunner.query(
      `ALTER TABLE core."AuthIdentities" DROP COLUMN "DomainID"`,
    );

    await queryRunner.query(`DROP INDEX core."UQ_Users_DomainID_UserName"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_Users_UserName" ON core."Users" ("UserName")`,
    );
    await queryRunner.query(
      `ALTER TABLE core."Users" ALTER COLUMN "DomainID" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE core."Users" RENAME COLUMN "DomainID" TO "PreferredDomainID"`,
    );
  }
}
