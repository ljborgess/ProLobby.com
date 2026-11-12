// #313: a Supporter plan lapses, and changing a plan is audited.
import { Migration } from '@mikro-orm/migrations'

const BEFORE = `'role_changed', 'case_resolved', 'player_searched', 'two_factor_enrollment', 'recovery_code_used'`

export class Migration20261112150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "account" add column "plan_expires_at" timestamptz null;`)
    // A Supporter from before this column would never lapse: give it the month from now.
    this.addSql(
      `update "account" set "plan_expires_at" = now() + interval '30 days' where "plan" = 'supporter';`,
    )
    this.addSql(`alter table "audit_entry" drop constraint if exists "audit_entry_action_check";`)
    this.addSql(
      `alter table "audit_entry" add constraint "audit_entry_action_check" check ("action" in (${BEFORE}, 'plan_changed'));`,
    )
  }

  // audit_entry is append-only: rows already marked plan_changed stay, so the
  // narrower check only applies to new rows (`not valid`).
  override async down(): Promise<void> {
    this.addSql(`alter table "audit_entry" drop constraint if exists "audit_entry_action_check";`)
    this.addSql(
      `alter table "audit_entry" add constraint "audit_entry_action_check" check ("action" in (${BEFORE})) not valid;`,
    )
    this.addSql(`alter table "account" drop column "plan_expires_at";`)
  }
}
