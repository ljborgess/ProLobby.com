// #312: the panel's player search is written to the audit log.
import { Migration } from '@mikro-orm/migrations'

// The list follows AuditAction's order, and carries the #311 two-factor actions
// too: whichever of the two merges first, the final constraint has them all.
const BEFORE = `'role_changed', 'case_resolved'`
const TWO_FACTOR = `'two_factor_enrollment', 'recovery_code_used'`

export class Migration20261112120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "audit_entry" drop constraint if exists "audit_entry_action_check";`)
    this.addSql(
      `alter table "audit_entry" add constraint "audit_entry_action_check" check ("action" in (${BEFORE}, 'player_searched', ${TWO_FACTOR}));`,
    )
  }

  // audit_entry is append-only: rows already marked player_searched stay, so the
  // narrower check only applies to new rows (`not valid`).
  override async down(): Promise<void> {
    this.addSql(`alter table "audit_entry" drop constraint if exists "audit_entry_action_check";`)
    this.addSql(
      `alter table "audit_entry" add constraint "audit_entry_action_check" check ("action" in (${BEFORE}, ${TWO_FACTOR})) not valid;`,
    )
  }
}
