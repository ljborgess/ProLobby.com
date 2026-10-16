// Fase 4.1, fatia D: expiração por zero-report.
import { Migration } from '@mikro-orm/migrations'

export class Migration20261016120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in ('waiting_players', 'waiting_captain', 'waiting_invite', 'in_progress', 'awaiting_confirmation', 'not_confirmed', 'finished', 'in_dispute', 'expired_no_report', 'cancelled_no_fault', 'cancelled_by_captain'));`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in ('waiting_players', 'waiting_captain', 'waiting_invite', 'in_progress', 'awaiting_confirmation', 'not_confirmed', 'finished', 'in_dispute', 'cancelled_no_fault', 'cancelled_by_captain'));`,
    )
  }
}
