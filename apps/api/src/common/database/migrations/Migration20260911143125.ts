// Base schema: terms acceptance, event log, moderation case, ban list and
// payment record (issues #76 to #80). Data model: docs/requisitos/03-dados.md.
import { Migration } from '@mikro-orm/migrations'

export class Migration20260911143125 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "elo_event" ("id" uuid not null, "character_id" uuid not null, "delta" smallint not null, "reason" text check ("reason" in ('match_result', 'seed', 'inactivity_decay', 'dispute_rollback')) not null, "lobby_id" uuid null, "reverted_at" timestamptz null, "created_at" timestamptz not null, constraint "elo_event_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index "elo_event_character_id_created_at_index" on "elo_event" ("character_id", "created_at");`,
    )

    this.addSql(
      `create table "moderation_case" ("id" uuid not null, "type" text check ("type" in ('score_dispute', 'ocr_exception', 'user_report', 'punishment_appeal', 'captain_abuse', 'bot_delivery_failure', 'negative_rating_threshold', 'account_recovery', 'gamertag_change', 'possible_game_bug')) not null, "state" text check ("state" in ('open', 'resolved', 'dismissed')) not null default 'open', "origin" text check ("origin" in ('system', 'user', 'discord_message')) not null, "lobby_id" uuid null, "target_account_id" uuid null, "opened_by_id" uuid null, "resolved_by_id" uuid null, "resolved_at" timestamptz null, "decision" text null, "opened_at" timestamptz not null, constraint "moderation_case_pkey" primary key ("id"));`,
    )
    this.addSql(`create index "moderation_case_state_index" on "moderation_case" ("state");`)
    this.addSql(
      `create index "moderation_case_opened_by_id_index" on "moderation_case" ("opened_by_id");`,
    )

    this.addSql(
      `create table "blocked_identity" ("id" uuid not null, "discord_id_hash" varchar(64) null, "gamertag_hash" varchar(64) null, "platform" text check ("platform" in ('ps5', 'xbox_series', 'pc')) null, "reason" text not null, "case_id" uuid null, "created_at" timestamptz not null, constraint "blocked_identity_pkey" primary key ("id"));`,
    )
    this.addSql(
      `alter table "blocked_identity" add constraint "blocked_identity_discord_id_hash_unique" unique ("discord_id_hash");`,
    )
    this.addSql(
      `create index "blocked_identity_created_at_index" on "blocked_identity" ("created_at");`,
    )
    this.addSql(
      `alter table "blocked_identity" add constraint "blocked_identity_platform_gamertag_hash_unique" unique ("platform", "gamertag_hash");`,
    )

    this.addSql(
      `create table "payment_event" ("id" uuid not null, "account_id" uuid null, "type" text check ("type" in ('founder', 'supporter')) not null, "amount" numeric(10,2) not null, "confirmed_by_id" uuid null, "confirmed_at" timestamptz null, "created_at" timestamptz not null, constraint "payment_event_pkey" primary key ("id"));`,
    )
    this.addSql(`create index "payment_event_account_id_index" on "payment_event" ("account_id");`)

    this.addSql(
      `create table "reputation_event" ("id" uuid not null, "account_id" uuid not null, "delta" smallint not null, "reason" text check ("reason" in ('clean_match', 'peer_thumbs_up', 'zero_report', 'disconnect', 'suspension_served', 'moderation_adjustment')) not null, "lobby_id" uuid null, "reverted_at" timestamptz null, "created_at" timestamptz not null, constraint "reputation_event_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index "reputation_event_account_id_created_at_index" on "reputation_event" ("account_id", "created_at");`,
    )

    this.addSql(
      `create table "terms_acceptance" ("id" uuid not null, "account_id" uuid not null, "version" varchar(32) not null, "accepted_at" timestamptz not null, constraint "terms_acceptance_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index "terms_acceptance_account_id_index" on "terms_acceptance" ("account_id");`,
    )

    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_target_account_id_foreign" foreign key ("target_account_id") references "account" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_opened_by_id_foreign" foreign key ("opened_by_id") references "account" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_resolved_by_id_foreign" foreign key ("resolved_by_id") references "account" ("id") on update cascade on delete set null;`,
    )

    this.addSql(
      `alter table "blocked_identity" add constraint "blocked_identity_case_id_foreign" foreign key ("case_id") references "moderation_case" ("id") on update cascade on delete set null;`,
    )

    this.addSql(
      `alter table "payment_event" add constraint "payment_event_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "payment_event" add constraint "payment_event_confirmed_by_id_foreign" foreign key ("confirmed_by_id") references "account" ("id") on update cascade on delete set null;`,
    )

    this.addSql(
      `alter table "reputation_event" add constraint "reputation_event_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )

    this.addSql(
      `alter table "terms_acceptance" add constraint "terms_acceptance_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "blocked_identity" drop constraint "blocked_identity_case_id_foreign";`,
    )

    this.addSql(`drop table if exists "elo_event" cascade;`)

    this.addSql(`drop table if exists "moderation_case" cascade;`)

    this.addSql(`drop table if exists "blocked_identity" cascade;`)

    this.addSql(`drop table if exists "payment_event" cascade;`)

    this.addSql(`drop table if exists "reputation_event" cascade;`)

    this.addSql(`drop table if exists "terms_acceptance" cascade;`)
  }
}
