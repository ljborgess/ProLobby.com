// Phase 2.5, #232: the 30 s confirmation and the refusals behind the queue block.
import { Migration } from '@mikro-orm/migrations'

export class Migration20261007133252 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "queue_refusal" ("id" uuid not null, "account_id" uuid not null, "lobby_id" uuid not null, "created_at" timestamptz not null, constraint "queue_refusal_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index "queue_refusal_account_id_created_at_index" on "queue_refusal" ("account_id", "created_at");`,
    )
    this.addSql(
      `alter table "queue_refusal" add constraint "queue_refusal_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )

    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in ('waiting_players', 'waiting_captain'));`,
    )

    this.addSql(`alter table "lobby_participation" add column "confirmed_at" timestamptz null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "lobby_participation" drop column "confirmed_at";`)
    this.addSql(`alter table "lobby" drop constraint if exists "lobby_state_check";`)
    this.addSql(
      `alter table "lobby" add constraint "lobby_state_check" check("state" in ('waiting_players'));`,
    )
    this.addSql(`drop table if exists "queue_refusal" cascade;`)
  }
}
