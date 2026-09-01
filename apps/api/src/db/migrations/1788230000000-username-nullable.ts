/**
 * Migration: username-nullable
 *
 * A user can sign in (email OTP or wallet) before claiming a username. Until
 * they do, the profile page 404s and the dashboard prompts for a claim. The
 * unique index is unaffected — Postgres treats NULLs as distinct.
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn } from 'typeorm';

export default class UserNameNullable1788230000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('core.Users', 'UserName'))) return;

    await queryRunner.changeColumn(
      'core.Users',
      'UserName',
      new TableColumn({
        name: 'UserName',
        type: 'varchar',
        length: '30',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('core.Users', 'UserName'))) return;

    // Rows without a username cannot survive NOT NULL; they never claimed
    // anything, so there is nothing to keep.
    await queryRunner.query(
      `DELETE FROM core."Users" WHERE "UserName" IS NULL`,
    );

    await queryRunner.changeColumn(
      'core.Users',
      'UserName',
      new TableColumn({
        name: 'UserName',
        type: 'varchar',
        length: '30',
        isNullable: false,
      }),
    );
  }
}
