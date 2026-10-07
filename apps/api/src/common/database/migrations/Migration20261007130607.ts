// Phase 2.5, #231: the queue creates the lobby and places the humans.
import { Migration } from '@mikro-orm/migrations'

export class Migration20261007130607 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "lobby" ("id" uuid not null, "state" text check ("state" in ('waiting_players')) not null default 'waiting_players', "created_at" timestamptz not null, constraint "lobby_pkey" primary key ("id"));`,
    )

    this.addSql(
      `create table "lobby_participation" ("id" uuid not null, "lobby_id" uuid not null, "account_id" uuid not null, "character_id" uuid not null, "side" text check ("side" in ('a', 'b')) not null, "category" text check ("category" in ('goalkeeper', 'defender', 'midfielder', 'winger', 'striker')) not null, constraint "lobby_participation_pkey" primary key ("id"));`,
    )
    this.addSql(
      `alter table "lobby_participation" add constraint "lobby_participation_lobby_id_account_id_unique" unique ("lobby_id", "account_id");`,
    )

    this.addSql(
      `alter table "lobby_participation" add constraint "lobby_participation_lobby_id_foreign" foreign key ("lobby_id") references "lobby" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "lobby_participation" add constraint "lobby_participation_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "lobby_participation" add constraint "lobby_participation_character_id_foreign" foreign key ("character_id") references "character" ("id") on update cascade on delete cascade;`,
    )

    this.addSql(`alter table "queue_entry" add column "lobby_id" uuid null;`)
    this.addSql(
      `alter table "queue_entry" add constraint "queue_entry_lobby_id_foreign" foreign key ("lobby_id") references "lobby" ("id") on update cascade on delete set null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "queue_entry" drop constraint "queue_entry_lobby_id_foreign";`)
    this.addSql(`alter table "queue_entry" drop column "lobby_id";`)
    this.addSql(`drop table if exists "lobby_participation" cascade;`)
    this.addSql(`drop table if exists "lobby" cascade;`)
  }
}
