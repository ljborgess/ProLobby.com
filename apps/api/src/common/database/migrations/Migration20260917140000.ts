// Per-account sign-in limit — item 11 of the security checklist, RNF-011.
// The per-IP bucket never saw a distributed attempt against one account.
import { Migration } from '@mikro-orm/migrations'

export class Migration20260917140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "failed_sign_in" ("id" uuid not null, "account_id" uuid not null, "created_at" timestamptz not null, constraint "failed_sign_in_pkey" primary key ("id"));`,
    )
    this.addSql(
      `alter table "failed_sign_in" add constraint "failed_sign_in_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )
    // The only query this table serves: attempts for one account inside the
    // window. Composite and in this order, so the count is an index range scan
    // and never a scan of every failure the platform has ever recorded.
    this.addSql(
      `create index "failed_sign_in_account_id_created_at_index" on "failed_sign_in" ("account_id", "created_at");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "failed_sign_in" cascade;`)
  }
}
