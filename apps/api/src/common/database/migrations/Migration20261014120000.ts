// Fase 3, #248: convite recebido em 5 min.
import { Migration } from '@mikro-orm/migrations'

export class Migration20261014120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in ('waiting_players', 'waiting_captain', 'waiting_invite', 'in_progress', 'cancelled_no_fault', 'cancelled_by_captain'));`,
    )
    this.addSql(
      `alter table "lobby_participation" add column "invite_received_at" timestamptz null, add column "club_full_declared_at" timestamptz null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "lobby_participation" drop column "invite_received_at", drop column "club_full_declared_at";`,
    )
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in ('waiting_players', 'waiting_captain', 'waiting_invite', 'cancelled_no_fault'));`,
    )
  }
}
