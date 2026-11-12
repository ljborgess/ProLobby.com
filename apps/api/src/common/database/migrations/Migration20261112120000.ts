// #312: the panel's player search is written to the audit log.
import { Migration } from '@mikro-orm/migrations'

// Every action any branch may have added by now (#311 adds the two-factor ones):
// a check constraint lists them all, whatever order the migrations run in.
const ACTIONS = `'role_changed', 'case_resolved', 'two_factor_enrollment', 'recovery_code_used'`

export class Migration20261112120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "audit_entry" drop constraint if exists "audit_entry_action_check";`)
    this.addSql(
      `alter table "audit_entry" add constraint "audit_entry_action_check" check ("action" in (${ACTIONS}, 'player_searched'));`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "audit_entry" drop constraint if exists "audit_entry_action_check";`)
    this.addSql(
      `alter table "audit_entry" add constraint "audit_entry_action_check" check ("action" in (${ACTIONS}));`,
    )
  }
}
