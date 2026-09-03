/**
 * Migration: profile-customization
 *
 * The pay page is the payee's profile; give them guardrailed control over it:
 *
 *   - AccentHue: 0-359, the single hue their page's accent colours derive
 *     from. NULL means the deterministic hue computed from the username.
 *   - PresetAmounts: up to four quick-tap amounts, [{assetId, amount}] with
 *     amount as a decimal string (SV13 — amounts never live as numbers).
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class ProfileCustomization1788250000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE core."Users" ADD COLUMN "AccentHue" smallint`,
    );
    await queryRunner.query(
      `ALTER TABLE core."Users" ADD COLUMN "PresetAmounts" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE core."Users" DROP COLUMN "PresetAmounts"`,
    );
    await queryRunner.query(`ALTER TABLE core."Users" DROP COLUMN "AccentHue"`);
  }
}
