// Sign-up waiting list — RF-078. Not linked to `account`: joining never
// creates one.
import { Migration } from '@mikro-orm/migrations'

export class Migration20260916150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "waiting_list_entry" ("id" uuid not null, "email" varchar(320) not null, "created_at" timestamptz not null, constraint "waiting_list_entry_pkey" primary key ("id"));`,
    )
    this.addSql(
      `alter table "waiting_list_entry" add constraint "waiting_list_entry_email_unique" unique ("email");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "waiting_list_entry" cascade;`)
  }
}
