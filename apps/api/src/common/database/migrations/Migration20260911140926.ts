// Initial schema: the account table (issue #75).
// Data model: docs/requisitos/03-dados.md#conta.
import { Migration } from '@mikro-orm/migrations'

export class Migration20260911140926 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "account" ("id" uuid not null, "email" varchar(320) not null, "password_hash" varchar(255) not null, "email_verified" boolean not null default false, "birth_date" date not null, "security_question" varchar(200) not null, "security_answer_hash" varchar(255) not null, "discord_id" varchar(32) null, "role" text check ("role" in ('user', 'moderator', 'admin')) not null default 'user', "reputation" smallint not null default 70, "plan" text check ("plan" in ('none', 'founder', 'supporter')) not null default 'none', "state" text check ("state" in ('unverified', 'active', 'suspended', 'banned', 'deleted')) not null default 'unverified', "suspension_ends_at" timestamptz null, "created_at" timestamptz not null, constraint "account_pkey" primary key ("id"));`,
    )
    this.addSql(`alter table "account" add constraint "account_email_unique" unique ("email");`)
    this.addSql(
      `alter table "account" add constraint "account_discord_id_unique" unique ("discord_id");`,
    )
    this.addSql(`create index "account_state_index" on "account" ("state");`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "account" cascade;`)
  }
}
