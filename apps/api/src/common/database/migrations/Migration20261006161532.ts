// Phase 2.5, #228: the queue entry, one per account (RF-001).
import { Migration } from '@mikro-orm/migrations'

export class Migration20261006161532 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "queue_entry" ("id" uuid not null, "account_id" uuid not null, "character_id" uuid not null, "category" text check ("category" in ('goalkeeper', 'defender', 'midfielder', 'winger', 'striker')) not null, "elo_at_entry" int not null, "joined_at" timestamptz not null, constraint "queue_entry_pkey" primary key ("id"));`,
    )
    this.addSql(
      `alter table "queue_entry" add constraint "queue_entry_account_id_unique" unique ("account_id");`,
    )

    this.addSql(
      `alter table "queue_entry" add constraint "queue_entry_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "queue_entry" add constraint "queue_entry_character_id_foreign" foreign key ("character_id") references "character" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "queue_entry" cascade;`)
  }
}
