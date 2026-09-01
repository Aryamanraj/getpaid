/**
 * Migration: initial-schema
 *
 * Single source-of-truth migration for the v1 schema. Creation order respects
 * FK dependencies:
 *
 *   public
 *     1.  All enum types (unqualified names resolve via search_path)
 *
 *   core
 *     2.  Domains              (self-FK AliasOfDomainID, added after create)
 *     3.  Users                (FK → Domains)
 *     4.  ReservedUserNames    (no FKs)
 *     5.  AuthIdentities       (FK → Users)
 *     6.  OtpCodes             (no FKs)
 *     7.  AuthNonces           (no FKs)
 *     8.  RefreshTokens        (FK → Users)
 *     9.  Chains               (no FKs)
 *    10.  Assets               (FK → Chains)
 *    11.  PayoutAddresses      (FK → Users)
 *    12.  AcceptedAssets       (FK → Users, Assets, PayoutAddresses)
 *    13.  PaymentMethods       (FK → Users)
 *    14.  PaymentRequests      (FK → Users, Domains, Assets, Chains)
 *    15.  PaymentTransactions  (FK → PaymentRequests, Chains, Assets)
 *    16.  PlatformConfig       (FK → Users nullable, CHECK on IsSecret/IsPublic)
 *
 *   ops
 *    17.  VerificationJobs     (FK → core.PaymentTransactions)
 *    18.  VerificationAttempts (FK → VerificationJobs)
 *    19.  AdminActionLog       (no FKs)
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

const ENUMS: Record<string, string[]> = {
  auth_provider_enum: ['email', 'wallet'],
  chain_namespace_enum: ['eip155', 'solana', 'bip122', 'tron'],
  payment_method_type_enum: ['crypto-address', 'upi', 'bank-transfer'],
  payment_request_status_enum: [
    'pending',
    'submitted',
    'confirmed',
    'failed',
    'expired',
  ],
  tx_status_enum: ['pending', 'confirmed', 'failed', 'mismatched'],
  tx_submission_enum: ['wallet', 'manual'],
  verification_job_status_enum: ['queued', 'running', 'succeeded', 'failed'],
};

const pk = (name: string): TableColumn =>
  new TableColumn({
    name,
    type: 'serial',
    isPrimary: true,
  });

const createdAt = (): TableColumn =>
  new TableColumn({
    name: 'CreatedAt',
    type: 'timestamptz',
    isNullable: false,
    default: 'CURRENT_TIMESTAMP',
  });

const updatedAt = (): TableColumn =>
  new TableColumn({
    name: 'UpdatedAt',
    type: 'timestamptz',
    isNullable: false,
    default: 'CURRENT_TIMESTAMP',
  });

const col = (
  name: string,
  type: string,
  options: Partial<TableColumn> = {},
): TableColumn =>
  new TableColumn({ name, type, isNullable: true, ...(options as object) });

// TypeORM resolves an unqualified referencedTableName against the referencing
// table's own schema, so a cross-schema FK (ops → core) needs the schema split
// out explicitly.
const fk = (
  columnName: string,
  referencedTable: string,
  referencedColumnName: string,
  onDelete = 'RESTRICT',
): TableForeignKey => {
  const [referencedSchema, referencedTableName] = referencedTable.split('.');
  return new TableForeignKey({
    columnNames: [columnName],
    referencedSchema,
    referencedTableName,
    referencedColumnNames: [referencedColumnName],
    onDelete,
  });
};

export default class InitialSchema1788220800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Schemas ─────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "core"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "ops"`);

    // ─── Enum types (M6 — idempotent) ───────────────────────────────────────
    for (const [name, values] of Object.entries(ENUMS)) {
      const list = values.map((v) => `'${v}'`).join(', ');
      await queryRunner.query(`
        DO $$ BEGIN
          CREATE TYPE "${name}" AS ENUM (${list});
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
    }

    // ─── core.Domains ────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.Domains'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'Domains',
          columns: [
            pk('DomainID'),
            col('Host', 'varchar', { length: '253', isNullable: false }),
            col('IsActive', 'boolean', { isNullable: false, default: true }),
            col('IsDefault', 'boolean', { isNullable: false, default: false }),
            col('AliasOfDomainID', 'int'),
            col('BrandName', 'varchar', { length: '128', isNullable: false }),
            col('Tagline', 'varchar', { length: '256' }),
            col('LogoUrl', 'varchar', { length: '2048' }),
            col('FaviconUrl', 'varchar', { length: '2048' }),
            col('OgImageConfig', 'jsonb'),
            col('ThemeConfig', 'jsonb', {
              isNullable: false,
              default: `'{}'::jsonb`,
            }),
            col('SupportEmail', 'varchar', { length: '320' }),
            col('MailFromAddress', 'varchar', { length: '320' }),
            col('LegalEntity', 'varchar', { length: '256' }),
            col('SocialLinks', 'jsonb'),
            col('SortOrder', 'int', { isNullable: false, default: 0 }),
            createdAt(),
            updatedAt(),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_Domains_Host',
              columnNames: ['Host'],
              isUnique: true,
            }),
          ],
        }),
        true,
      );
      await queryRunner.createForeignKey(
        'core.Domains',
        fk('AliasOfDomainID', 'core.Domains', 'DomainID', 'SET NULL'),
      );
    }

    // ─── core.Users ──────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.Users'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'Users',
          columns: [
            pk('UserID'),
            col('UserName', 'varchar', { length: '30', isNullable: false }),
            col('DisplayName', 'varchar', { length: '64' }),
            col('Bio', 'varchar', { length: '280' }),
            col('AvatarUrl', 'varchar', { length: '2048' }),
            col('PreferredDomainID', 'int'),
            col('IsActive', 'boolean', { isNullable: false, default: true }),
            createdAt(),
            updatedAt(),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_Users_UserName',
              columnNames: ['UserName'],
              isUnique: true,
            }),
          ],
          foreignKeys: [
            fk('PreferredDomainID', 'core.Domains', 'DomainID', 'SET NULL'),
          ],
        }),
        true,
      );
    }

    // ─── core.ReservedUserNames ──────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.ReservedUserNames'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'ReservedUserNames',
          columns: [
            pk('ReservedUserNameID'),
            col('Name', 'varchar', { length: '30', isNullable: false }),
            col('Reason', 'varchar', { length: '256' }),
            createdAt(),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_ReservedUserNames_Name',
              columnNames: ['Name'],
              isUnique: true,
            }),
          ],
        }),
        true,
      );
    }

    // ─── core.AuthIdentities ─────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.AuthIdentities'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'AuthIdentities',
          columns: [
            pk('AuthIdentityID'),
            col('UserID', 'int', { isNullable: false }),
            col('Provider', 'auth_provider_enum', { isNullable: false }),
            col('Identifier', 'varchar', { length: '320', isNullable: false }),
            col('Namespace', 'chain_namespace_enum'),
            col('IsPrimary', 'boolean', { isNullable: false, default: false }),
            col('VerifiedAt', 'timestamptz'),
            createdAt(),
            updatedAt(),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_AuthIdentities_Provider_Identifier',
              columnNames: ['Provider', 'Identifier'],
              isUnique: true,
            }),
            new TableIndex({
              name: 'IX_AuthIdentities_UserID',
              columnNames: ['UserID'],
            }),
          ],
          foreignKeys: [fk('UserID', 'core.Users', 'UserID', 'CASCADE')],
        }),
        true,
      );
    }

    // ─── core.OtpCodes ───────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.OtpCodes'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'OtpCodes',
          columns: [
            pk('OtpCodeID'),
            col('Email', 'varchar', { length: '320', isNullable: false }),
            col('CodeHash', 'varchar', { length: '128', isNullable: false }),
            col('ExpiresAt', 'timestamptz', { isNullable: false }),
            col('ConsumedAt', 'timestamptz'),
            col('Attempts', 'int', { isNullable: false, default: 0 }),
            col('RequestIp', 'varchar', { length: '64' }),
            createdAt(),
          ],
          indices: [
            new TableIndex({
              name: 'IX_OtpCodes_Email_ExpiresAt',
              columnNames: ['Email', 'ExpiresAt'],
            }),
          ],
        }),
        true,
      );
    }

    // ─── core.AuthNonces ─────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.AuthNonces'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'AuthNonces',
          columns: [
            pk('AuthNonceID'),
            col('Address', 'varchar', { length: '128', isNullable: false }),
            col('Namespace', 'chain_namespace_enum', { isNullable: false }),
            col('Nonce', 'varchar', { length: '128', isNullable: false }),
            col('ExpiresAt', 'timestamptz', { isNullable: false }),
            col('ConsumedAt', 'timestamptz'),
            createdAt(),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_AuthNonces_Nonce',
              columnNames: ['Nonce'],
              isUnique: true,
            }),
            new TableIndex({
              name: 'IX_AuthNonces_Address_ExpiresAt',
              columnNames: ['Address', 'ExpiresAt'],
            }),
          ],
        }),
        true,
      );
    }

    // ─── core.RefreshTokens ──────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.RefreshTokens'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'RefreshTokens',
          columns: [
            pk('RefreshTokenID'),
            col('UserID', 'int', { isNullable: false }),
            col('TokenHash', 'varchar', { length: '128', isNullable: false }),
            col('FamilyID', 'varchar', { length: '64' }),
            col('ExpiresAt', 'timestamptz', { isNullable: false }),
            col('RevokedAt', 'timestamptz'),
            col('UserAgent', 'varchar', { length: '512' }),
            col('Ip', 'varchar', { length: '64' }),
            createdAt(),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_RefreshTokens_TokenHash',
              columnNames: ['TokenHash'],
              isUnique: true,
            }),
            new TableIndex({
              name: 'IX_RefreshTokens_UserID',
              columnNames: ['UserID'],
            }),
          ],
          foreignKeys: [fk('UserID', 'core.Users', 'UserID', 'CASCADE')],
        }),
        true,
      );
    }

    // ─── core.Chains ─────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.Chains'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'Chains',
          columns: [
            pk('ChainID'),
            col('Namespace', 'chain_namespace_enum', { isNullable: false }),
            col('ChainRef', 'varchar', { length: '64', isNullable: false }),
            col('Name', 'varchar', { length: '64', isNullable: false }),
            col('Slug', 'varchar', { length: '64', isNullable: false }),
            col('NativeSymbol', 'varchar', { length: '16', isNullable: false }),
            col('NativeDecimals', 'int', { isNullable: false }),
            col('ExplorerTxUrlTemplate', 'varchar', {
              length: '512',
              isNullable: false,
            }),
            col('RequiredConfirmations', 'int', {
              isNullable: false,
              default: 1,
            }),
            col('IsActive', 'boolean', { isNullable: false, default: true }),
            col('SortOrder', 'int', { isNullable: false, default: 0 }),
            createdAt(),
            updatedAt(),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_Chains_Namespace_ChainRef',
              columnNames: ['Namespace', 'ChainRef'],
              isUnique: true,
            }),
            new TableIndex({
              name: 'UQ_Chains_Slug',
              columnNames: ['Slug'],
              isUnique: true,
            }),
          ],
        }),
        true,
      );
    }

    // ─── core.Assets ─────────────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.Assets'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'Assets',
          columns: [
            pk('AssetID'),
            col('ChainID', 'int', { isNullable: false }),
            col('Symbol', 'varchar', { length: '32', isNullable: false }),
            col('Name', 'varchar', { length: '128', isNullable: false }),
            col('ContractAddress', 'varchar', { length: '128' }),
            col('Decimals', 'int', { isNullable: false }),
            col('LogoUrl', 'varchar', { length: '2048' }),
            col('IsStablecoin', 'boolean', {
              isNullable: false,
              default: false,
            }),
            col('IsActive', 'boolean', { isNullable: false, default: true }),
            col('SortOrder', 'int', { isNullable: false, default: 0 }),
            createdAt(),
            updatedAt(),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_Assets_ChainID_ContractAddress',
              columnNames: ['ChainID', 'ContractAddress'],
              isUnique: true,
            }),
          ],
          foreignKeys: [fk('ChainID', 'core.Chains', 'ChainID', 'CASCADE')],
        }),
        true,
      );
    }

    // ─── core.PayoutAddresses ────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.PayoutAddresses'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'PayoutAddresses',
          columns: [
            pk('PayoutAddressID'),
            col('UserID', 'int', { isNullable: false }),
            col('Namespace', 'chain_namespace_enum', { isNullable: false }),
            col('Address', 'varchar', { length: '128', isNullable: false }),
            col('Label', 'varchar', { length: '64' }),
            col('IsProven', 'boolean', { isNullable: false, default: false }),
            col('IsActive', 'boolean', { isNullable: false, default: true }),
            createdAt(),
            updatedAt(),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_PayoutAddresses_UserID_Namespace_Address',
              columnNames: ['UserID', 'Namespace', 'Address'],
              isUnique: true,
            }),
          ],
          foreignKeys: [fk('UserID', 'core.Users', 'UserID', 'CASCADE')],
        }),
        true,
      );
    }

    // ─── core.AcceptedAssets ─────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.AcceptedAssets'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'AcceptedAssets',
          columns: [
            pk('AcceptedAssetID'),
            col('UserID', 'int', { isNullable: false }),
            col('AssetID', 'int', { isNullable: false }),
            col('PayoutAddressID', 'int', { isNullable: false }),
            col('IsActive', 'boolean', { isNullable: false, default: true }),
            col('SortOrder', 'int', { isNullable: false, default: 0 }),
            createdAt(),
            updatedAt(),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_AcceptedAssets_UserID_AssetID',
              columnNames: ['UserID', 'AssetID'],
              isUnique: true,
            }),
          ],
          foreignKeys: [
            fk('UserID', 'core.Users', 'UserID', 'CASCADE'),
            fk('AssetID', 'core.Assets', 'AssetID', 'CASCADE'),
            fk(
              'PayoutAddressID',
              'core.PayoutAddresses',
              'PayoutAddressID',
              'CASCADE',
            ),
          ],
        }),
        true,
      );
    }

    // ─── core.PaymentMethods ─────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.PaymentMethods'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'PaymentMethods',
          columns: [
            pk('PaymentMethodID'),
            col('UserID', 'int', { isNullable: false }),
            col('MethodType', 'payment_method_type_enum', {
              isNullable: false,
            }),
            col('Label', 'varchar', { length: '64' }),
            col('Details', 'text'),
            col('IsActive', 'boolean', { isNullable: false, default: true }),
            col('SortOrder', 'int', { isNullable: false, default: 0 }),
            createdAt(),
            updatedAt(),
          ],
          indices: [
            new TableIndex({
              name: 'IX_PaymentMethods_UserID',
              columnNames: ['UserID'],
            }),
          ],
          foreignKeys: [fk('UserID', 'core.Users', 'UserID', 'CASCADE')],
        }),
        true,
      );
    }

    // ─── core.PaymentRequests ────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.PaymentRequests'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'PaymentRequests',
          columns: [
            pk('PaymentRequestID'),
            col('PublicID', 'varchar', { length: '32', isNullable: false }),
            col('PayeeUserID', 'int', { isNullable: false }),
            col('DomainID', 'int'),
            col('AssetID', 'int', { isNullable: false }),
            col('ChainID', 'int', { isNullable: false }),
            col('ToAddress', 'varchar', { length: '128', isNullable: false }),
            col('AmountRaw', 'numeric', {
              precision: 78,
              scale: 0,
              isNullable: false,
            }),
            col('Note', 'varchar', { length: '280' }),
            col('PayerName', 'varchar', { length: '128' }),
            col('PayerEmail', 'varchar', { length: '320' }),
            col('Status', 'payment_request_status_enum', {
              isNullable: false,
              default: `'pending'`,
            }),
            col('ExpiresAt', 'timestamptz'),
            createdAt(),
            updatedAt(),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_PaymentRequests_PublicID',
              columnNames: ['PublicID'],
              isUnique: true,
            }),
            new TableIndex({
              name: 'IX_PaymentRequests_PayeeUserID',
              columnNames: ['PayeeUserID'],
            }),
            new TableIndex({
              name: 'IX_PaymentRequests_Status',
              columnNames: ['Status'],
            }),
          ],
          foreignKeys: [
            fk('PayeeUserID', 'core.Users', 'UserID', 'CASCADE'),
            fk('DomainID', 'core.Domains', 'DomainID', 'SET NULL'),
            fk('AssetID', 'core.Assets', 'AssetID'),
            fk('ChainID', 'core.Chains', 'ChainID'),
          ],
        }),
        true,
      );
    }

    // ─── core.PaymentTransactions ────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.PaymentTransactions'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'PaymentTransactions',
          columns: [
            pk('PaymentTransactionID'),
            col('PaymentRequestID', 'int', { isNullable: false }),
            col('ChainID', 'int', { isNullable: false }),
            col('AssetID', 'int'),
            col('TxHash', 'varchar', { length: '128', isNullable: false }),
            col('FromAddress', 'varchar', { length: '128' }),
            col('ToAddress', 'varchar', { length: '128' }),
            col('AmountRaw', 'numeric', { precision: 78, scale: 0 }),
            col('BlockNumber', 'bigint'),
            col('BlockTimestamp', 'timestamptz'),
            col('Confirmations', 'int', { isNullable: false, default: 0 }),
            col('Status', 'tx_status_enum', {
              isNullable: false,
              default: `'pending'`,
            }),
            col('MismatchReason', 'varchar', { length: '512' }),
            col('SubmittedVia', 'tx_submission_enum', { isNullable: false }),
            col('RawPayload', 'jsonb'),
            col('VerifiedAt', 'timestamptz'),
            createdAt(),
            updatedAt(),
          ],
          indices: [
            // A given hash can never settle two requests.
            new TableIndex({
              name: 'UQ_PaymentTransactions_ChainID_TxHash',
              columnNames: ['ChainID', 'TxHash'],
              isUnique: true,
            }),
            new TableIndex({
              name: 'IX_PaymentTransactions_PaymentRequestID',
              columnNames: ['PaymentRequestID'],
            }),
          ],
          foreignKeys: [
            fk(
              'PaymentRequestID',
              'core.PaymentRequests',
              'PaymentRequestID',
              'CASCADE',
            ),
            fk('ChainID', 'core.Chains', 'ChainID'),
            fk('AssetID', 'core.Assets', 'AssetID', 'SET NULL'),
          ],
        }),
        true,
      );
    }

    // ─── core.PlatformConfig ─────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('core.PlatformConfig'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'core',
          name: 'PlatformConfig',
          columns: [
            pk('PlatformConfigID'),
            col('Key', 'varchar', { length: '128', isNullable: false }),
            col('Value', 'jsonb', { isNullable: false }),
            col('Description', 'text'),
            col('IsSecret', 'boolean', { isNullable: false, default: false }),
            col('IsPublic', 'boolean', { isNullable: false, default: false }),
            col('CacheTtlSeconds', 'int'),
            col('IsActive', 'boolean', { isNullable: false, default: true }),
            col('UpdatedBy', 'int'),
            col('SeedUpdatedAt', 'bigint'),
            createdAt(),
            updatedAt(),
          ],
          indices: [
            new TableIndex({
              name: 'UQ_PlatformConfig_Key',
              columnNames: ['Key'],
              isUnique: true,
            }),
          ],
          foreignKeys: [fk('UpdatedBy', 'core.Users', 'UserID', 'SET NULL')],
        }),
        true,
      );

      // PC9 — a key can never be both secret and public. Enforced in the
      // database as well as the service layer, so an admin mistake cannot
      // leak a secret into the browser bootstrap payload.
      await queryRunner.query(`
        ALTER TABLE core."PlatformConfig"
        ADD CONSTRAINT "CK_PlatformConfig_NotSecretAndPublic"
        CHECK (NOT ("IsSecret" AND "IsPublic"))
      `);
    }

    // ─── ops.VerificationJobs ────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('ops.VerificationJobs'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'ops',
          name: 'VerificationJobs',
          columns: [
            pk('VerificationJobID'),
            col('PaymentTransactionID', 'int', { isNullable: false }),
            col('Status', 'verification_job_status_enum', {
              isNullable: false,
              default: `'queued'`,
            }),
            col('AttemptCount', 'int', { isNullable: false, default: 0 }),
            col('NextRunAt', 'timestamptz'),
            col('LastError', 'varchar', { length: '1024' }),
            createdAt(),
            updatedAt(),
          ],
          indices: [
            new TableIndex({
              name: 'IX_VerificationJobs_Status_NextRunAt',
              columnNames: ['Status', 'NextRunAt'],
            }),
          ],
          foreignKeys: [
            fk(
              'PaymentTransactionID',
              'core.PaymentTransactions',
              'PaymentTransactionID',
              'CASCADE',
            ),
          ],
        }),
        true,
      );
    }

    // ─── ops.VerificationAttempts ────────────────────────────────────────────
    if (!(await queryRunner.hasTable('ops.VerificationAttempts'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'ops',
          name: 'VerificationAttempts',
          columns: [
            pk('VerificationAttemptID'),
            col('VerificationJobID', 'int', { isNullable: false }),
            col('AttemptNumber', 'int', { isNullable: false }),
            col('Succeeded', 'boolean', { isNullable: false, default: false }),
            col('RpcEndpointUsed', 'varchar', { length: '128' }),
            col('DurationMs', 'int'),
            col('Outcome', 'varchar', { length: '1024' }),
            createdAt(),
          ],
          indices: [
            new TableIndex({
              name: 'IX_VerificationAttempts_VerificationJobID',
              columnNames: ['VerificationJobID'],
            }),
          ],
          foreignKeys: [
            fk(
              'VerificationJobID',
              'ops.VerificationJobs',
              'VerificationJobID',
              'CASCADE',
            ),
          ],
        }),
        true,
      );
    }

    // ─── ops.AdminActionLog ──────────────────────────────────────────────────
    if (!(await queryRunner.hasTable('ops.AdminActionLog'))) {
      await queryRunner.createTable(
        new Table({
          schema: 'ops',
          name: 'AdminActionLog',
          columns: [
            pk('AdminActionLogID'),
            col('Action', 'varchar', { length: '64', isNullable: false }),
            col('EntityName', 'varchar', { length: '64', isNullable: false }),
            col('EntityRef', 'varchar', { length: '128' }),
            col('Payload', 'jsonb'),
            col('Ip', 'varchar', { length: '64' }),
            createdAt(),
          ],
          indices: [
            new TableIndex({
              name: 'IX_AdminActionLog_Entity_CreatedAt',
              columnNames: ['EntityName', 'CreatedAt'],
            }),
          ],
        }),
        true,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse creation order — FK children first.
    const tables = [
      'ops.AdminActionLog',
      'ops.VerificationAttempts',
      'ops.VerificationJobs',
      'core.PlatformConfig',
      'core.PaymentTransactions',
      'core.PaymentRequests',
      'core.PaymentMethods',
      'core.AcceptedAssets',
      'core.PayoutAddresses',
      'core.Assets',
      'core.Chains',
      'core.RefreshTokens',
      'core.AuthNonces',
      'core.OtpCodes',
      'core.AuthIdentities',
      'core.ReservedUserNames',
      'core.Users',
      'core.Domains',
    ];

    for (const table of tables) {
      if (await queryRunner.hasTable(table)) {
        await queryRunner.dropTable(table, true, true);
      }
    }

    for (const name of Object.keys(ENUMS)) {
      await queryRunner.query(`DROP TYPE IF EXISTS "${name}"`);
    }

    await queryRunner.query(`DROP SCHEMA IF EXISTS "ops" CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS "core" CASCADE`);

    // Every seed wrote into the schemas just dropped, so their "applied"
    // records are now lies. Clearing the ledger lets them re-run on re-apply.
    await queryRunner.query(`DROP TABLE IF EXISTS "_seeds"`);
  }
}
