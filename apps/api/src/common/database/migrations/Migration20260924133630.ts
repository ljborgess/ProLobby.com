// Phase 2.2, #194: characters and one gamertag per platform per account.
// The partial unique indexes must stay byte-identical to the expressions in
// character.entity.ts and platform-gamertag.entity.ts.
import { Migration } from '@mikro-orm/migrations'

export class Migration20260924133630 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "character" ("id" uuid not null, "account_id" uuid not null, "category" text check ("category" in ('goalkeeper', 'defender', 'midfielder', 'winger', 'striker')) not null, "archetype" text check ("archetype" in ('shot_stopper', 'sweeper_keeper', 'progressor', 'boss', 'marauder', 'disruptor', 'recycler', 'maestro', 'creator', 'spark', 'magician', 'finisher', 'target')) not null, "platform" text check ("platform" in ('ps5', 'xbox_series', 'pc')) not null, "edition" text check ("edition" in ('fc27')) not null, "name" varchar(40) null, "matches_in_category" smallint not null default 0, "state" text check ("state" in ('pending_verification', 'verified', 'inactive', 'archived')) not null default 'pending_verification', "verified_at" timestamptz null, "created_at" timestamptz not null, constraint "character_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index "character_account_id_state_index" on "character" ("account_id", "state");`,
    )
    this.addSql(
      `create unique index "character_one_active_per_category" on "character" ("account_id", "category", "edition") where ("state" in ('pending_verification', 'verified'));`,
    )

    this.addSql(
      `create table "platform_gamertag" ("id" uuid not null, "account_id" uuid not null, "platform" text check ("platform" in ('ps5', 'xbox_series', 'pc')) not null, "gamertag_hash" varchar(64) not null, "gamertag_encrypted" bytea not null, "verified_at" timestamptz null, "created_at" timestamptz not null, constraint "platform_gamertag_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create unique index "platform_gamertag_verified_unique" on "platform_gamertag" ("platform", "gamertag_hash") where ("verified_at" is not null);`,
    )
    this.addSql(
      `alter table "platform_gamertag" add constraint "platform_gamertag_account_id_platform_unique" unique ("account_id", "platform");`,
    )

    this.addSql(
      `alter table "character" add constraint "character_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )

    this.addSql(
      `alter table "platform_gamertag" add constraint "platform_gamertag_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )

    this.addSql(
      `alter table "elo_event" add constraint "elo_event_character_id_foreign" foreign key ("character_id") references "character" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "elo_event" drop constraint "elo_event_character_id_foreign";`)

    this.addSql(`drop table if exists "character" cascade;`)

    this.addSql(`drop table if exists "platform_gamertag" cascade;`)
  }
}
