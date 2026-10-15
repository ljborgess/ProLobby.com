// Fase 4.1, fatia A: report de placar com print.
import { Migration } from '@mikro-orm/migrations'

export class Migration20261015150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in ('waiting_players', 'waiting_captain', 'waiting_invite', 'in_progress', 'awaiting_confirmation', 'cancelled_no_fault', 'cancelled_by_captain'));`,
    )
    this.addSql(`alter table "lobby" add column "first_report_at" timestamptz null;`)

    this.addSql(
      `create table "match_report" ("id" uuid not null, "lobby_id" uuid not null, "account_id" uuid null, "side" text check ("side" in ('a', 'b')) not null, "score_a" int not null, "score_b" int not null, "file_hash" varchar(64) not null, "file_path" text null, "submitted_at" timestamptz not null, "corrected_at" timestamptz null, constraint "match_report_pkey" primary key ("id"));`,
    )
    this.addSql(
      `alter table "match_report" add constraint "match_report_file_hash_unique" unique ("file_hash");`,
    )
    this.addSql(
      `alter table "match_report" add constraint "match_report_lobby_id_account_id_unique" unique ("lobby_id", "account_id");`,
    )
    this.addSql(
      `alter table "match_report" add constraint "match_report_lobby_id_foreign" foreign key ("lobby_id") references "lobby" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "match_report" add constraint "match_report_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete set null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "match_report" cascade;`)
    this.addSql(`alter table "lobby" drop column "first_report_at";`)
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in ('waiting_players', 'waiting_captain', 'waiting_invite', 'in_progress', 'cancelled_no_fault', 'cancelled_by_captain'));`,
    )
  }
}
