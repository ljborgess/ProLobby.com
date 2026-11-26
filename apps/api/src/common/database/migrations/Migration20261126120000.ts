// #335: the platform nickname, unique regardless of case.
import { Migration } from '@mikro-orm/migrations'

export class Migration20261126120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "account" add column "nickname" varchar(16) null;`)
    this.addSql(
      `create unique index "account_nickname_lower_unique" on "account" (lower("nickname"));`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "account_nickname_lower_unique";`)
    this.addSql(`alter table "account" drop column "nickname";`)
  }
}
