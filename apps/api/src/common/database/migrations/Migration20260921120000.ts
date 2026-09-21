// Pending Discord link: single-use `state` + PKCE verifier (#149).
import { Migration } from '@mikro-orm/migrations'

export class Migration20260921120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "discord_link_state" ("id" uuid not null, "account_id" uuid not null, "state_hash" varchar(64) not null, "code_verifier" varchar(128) not null, "expires_at" timestamptz not null, "used_at" timestamptz null, "created_at" timestamptz not null, constraint "discord_link_state_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index "discord_link_state_account_id_index" on "discord_link_state" ("account_id");`,
    )
    this.addSql(
      `create index "discord_link_state_state_hash_index" on "discord_link_state" ("state_hash");`,
    )
    this.addSql(
      `alter table "discord_link_state" add constraint "discord_link_state_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "discord_link_state" cascade;`)
  }
}
