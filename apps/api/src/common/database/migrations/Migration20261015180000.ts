// Fase 4.1, fatia B: confirmação cruzada do placar.
import { Migration } from '@mikro-orm/migrations'

export class Migration20261015180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in ('waiting_players', 'waiting_captain', 'waiting_invite', 'in_progress', 'awaiting_confirmation', 'not_confirmed', 'finished', 'in_dispute', 'cancelled_no_fault', 'cancelled_by_captain'));`,
    )
    this.addSql(
      `alter table "lobby" add column "unconfirmed_at" timestamptz null, add column "score_a" smallint null, add column "score_b" smallint null;`,
    )
    this.addSql(
      `create index "lobby_participation_account_id_index" on "lobby_participation" ("account_id");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index "lobby_participation_account_id_index";`)
    this.addSql(
      `alter table "lobby" drop column "unconfirmed_at", drop column "score_a", drop column "score_b";`,
    )
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in ('waiting_players', 'waiting_captain', 'waiting_invite', 'in_progress', 'awaiting_confirmation', 'cancelled_no_fault', 'cancelled_by_captain'));`,
    )
  }
}
