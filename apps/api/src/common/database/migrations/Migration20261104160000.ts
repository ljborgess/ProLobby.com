// #311: 2FA por TOTP obrigatório pra moderador e admin (RNF-010).
import { Migration } from '@mikro-orm/migrations'

export class Migration20261104160000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "account" add column "totp_secret_encrypted" bytea null, add column "totp_enabled_at" timestamptz null, add column "totp_last_step" bigint null, add column "recovery_code_hashes" jsonb null;`,
    )
    this.addSql(`alter table "audit_entry" drop constraint if exists "audit_entry_action_check";`)
    this.addSql(
      `alter table "audit_entry" add constraint "audit_entry_action_check" check ("action" in ('role_changed', 'case_resolved', 'two_factor_reset'));`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "audit_entry" drop constraint if exists "audit_entry_action_check";`)
    this.addSql(
      `alter table "audit_entry" add constraint "audit_entry_action_check" check ("action" in ('role_changed', 'case_resolved'));`,
    )
    this.addSql(
      `alter table "account" drop column "totp_secret_encrypted", drop column "totp_enabled_at", drop column "totp_last_step", drop column "recovery_code_hashes";`,
    )
  }
}
