// #311: TOTP second factor, required for moderators and admins (RNF-010).
import { Migration } from '@mikro-orm/migrations'

export class Migration20261104160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "account" add column "totp_secret_encrypted" bytea null, add column "totp_enabled_at" timestamptz null, add column "totp_last_step" int null, add column "recovery_code_hashes" jsonb null, add column "two_factor_enrollment_hash" varchar(255) null, add column "two_factor_enrollment_expires_at" timestamptz null;`,
    )
    this.addSql(
      `create table "failed_two_factor" ("id" uuid not null, "account_id" uuid not null, "created_at" timestamptz not null, constraint "failed_two_factor_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index "failed_two_factor_account_id_created_at_index" on "failed_two_factor" ("account_id", "created_at");`,
    )
    this.addSql(
      `alter table "failed_two_factor" add constraint "failed_two_factor_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(`alter table "audit_entry" drop constraint if exists "audit_entry_action_check";`)
    this.addSql(
      `alter table "audit_entry" add constraint "audit_entry_action_check" check ("action" in ('role_changed', 'case_resolved', 'two_factor_enrollment', 'recovery_code_used'));`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "failed_two_factor" cascade;`)
    this.addSql(`alter table "audit_entry" drop constraint if exists "audit_entry_action_check";`)
    this.addSql(
      `alter table "audit_entry" add constraint "audit_entry_action_check" check ("action" in ('role_changed', 'case_resolved'));`,
    )
    this.addSql(
      `alter table "account" drop column "totp_secret_encrypted", drop column "totp_enabled_at", drop column "totp_last_step", drop column "recovery_code_hashes", drop column "two_factor_enrollment_hash", drop column "two_factor_enrollment_expires_at";`,
    )
  }
}
