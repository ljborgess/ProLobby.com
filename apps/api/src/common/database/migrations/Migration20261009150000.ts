// Fase 3, #247: cascata de capitão.
import { Migration } from '@mikro-orm/migrations'

export class Migration20261009150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in ('waiting_players', 'waiting_captain', 'waiting_invite', 'cancelled_no_fault'));`,
    )
    this.addSql(
      `alter table "lobby" add column "captain_wait_started_at" timestamptz null, add column "closed_at" timestamptz null, add column "ended_at" timestamptz null, add column "captain_a_id" uuid null, add column "captain_b_id" uuid null, add column "club_a" varchar(20) null, add column "club_b" varchar(20) null;`,
    )
    this.addSql(
      `alter table "lobby" add constraint "lobby_captain_a_id_foreign" foreign key ("captain_a_id") references "account" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "lobby" add constraint "lobby_captain_b_id_foreign" foreign key ("captain_b_id") references "account" ("id") on update cascade on delete set null;`,
    )

    this.addSql(
      `create table "captain_offer" ("id" uuid not null, "lobby_id" uuid not null, "side" text check ("side" in ('a', 'b')) not null, "account_id" uuid not null, "offered_at" timestamptz not null, "outcome" text check ("outcome" in ('confirmed', 'declined', 'expired', 'withdrawn')) null, "answered_at" timestamptz null, "declared_full" boolean not null default false, constraint "captain_offer_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index "captain_offer_lobby_id_side_index" on "captain_offer" ("lobby_id", "side");`,
    )
    this.addSql(
      `alter table "captain_offer" add constraint "captain_offer_lobby_id_foreign" foreign key ("lobby_id") references "lobby" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "captain_offer" add constraint "captain_offer_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "captain_offer" cascade;`)
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_captain_a_id_foreign";`)
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_captain_b_id_foreign";`)
    this.addSql(
      `alter table "lobby" drop column "captain_wait_started_at", drop column "closed_at", drop column "ended_at", drop column "captain_a_id", drop column "captain_b_id", drop column "club_a", drop column "club_b";`,
    )
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in ('waiting_players', 'waiting_captain'));`,
    )
  }
}
