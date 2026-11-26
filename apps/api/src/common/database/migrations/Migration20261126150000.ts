// #342: a dispute moderation annulled is its own terminal state (RF-044).
import { Migration } from '@mikro-orm/migrations'

const BEFORE = `'waiting_players', 'waiting_captain', 'waiting_invite', 'in_progress', 'awaiting_confirmation', 'not_confirmed', 'finished', 'in_dispute', 'expired_no_report', 'cancelled_no_fault', 'cancelled_by_captain'`

export class Migration20261126150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in (${BEFORE}, 'annulled'));`,
    )
  }

  // An annulled lobby has no state to go back to: the narrower check applies
  // to new rows only (`not valid`), as in the audit_entry migrations.
  override async down(): Promise<void> {
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in (${BEFORE})) not valid;`,
    )
  }
}
