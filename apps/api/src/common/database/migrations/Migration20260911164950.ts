import { Migration } from '@mikro-orm/migrations'

export class Migration20260911164950 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "email_verification" ("id" uuid not null, "account_id" uuid not null, "token_hash" varchar(64) not null, "expires_at" timestamptz not null, "used_at" timestamptz null, "created_at" timestamptz not null, constraint "email_verification_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index "email_verification_account_id_index" on "email_verification" ("account_id");`,
    )
    this.addSql(
      `create index "email_verification_token_hash_index" on "email_verification" ("token_hash");`,
    )

    this.addSql(
      `alter table "email_verification" add constraint "email_verification_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "email_verification" cascade;`)
  }
}
