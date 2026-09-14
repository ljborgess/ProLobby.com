import { Migration } from '@mikro-orm/migrations'

export class Migration20260914142826 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "password_reset" ("id" uuid not null, "account_id" uuid not null, "token_hash" varchar(64) not null, "expires_at" timestamptz not null, "used_at" timestamptz null, "created_at" timestamptz not null, constraint "password_reset_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index "password_reset_account_id_index" on "password_reset" ("account_id");`,
    )
    this.addSql(
      `create index "password_reset_token_hash_index" on "password_reset" ("token_hash");`,
    )

    this.addSql(
      `alter table "password_reset" add constraint "password_reset_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "password_reset" cascade;`)
  }
}
