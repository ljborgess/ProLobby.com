// Fase 3, #249: votação de formação e os canais do lobby.
import { Migration } from '@mikro-orm/migrations'

export class Migration20261015120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "lobby" add column "text_channel_id" varchar(20) null, add column "voice_a_channel_id" varchar(20) null, add column "voice_b_channel_id" varchar(20) null, add column "formation_vote_started_at" timestamptz null, add column "formation_vote_closed_at" timestamptz null, add column "formation_a" varchar(12) null, add column "formation_b" varchar(12) null;`,
    )
    this.addSql(
      `create table "formation_vote" ("id" uuid not null, "lobby_id" uuid not null, "account_id" uuid not null, "formation" varchar(12) not null, "voted_at" timestamptz not null, constraint "formation_vote_pkey" primary key ("id"));`,
    )
    this.addSql(
      `alter table "formation_vote" add constraint "formation_vote_lobby_id_account_id_unique" unique ("lobby_id", "account_id");`,
    )
    this.addSql(
      `alter table "formation_vote" add constraint "formation_vote_lobby_id_foreign" foreign key ("lobby_id") references "lobby" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "formation_vote" add constraint "formation_vote_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "formation_vote" cascade;`)
    this.addSql(
      `alter table "lobby" drop column "text_channel_id", drop column "voice_a_channel_id", drop column "voice_b_channel_id", drop column "formation_vote_started_at", drop column "formation_vote_closed_at", drop column "formation_a", drop column "formation_b";`,
    )
  }
}
