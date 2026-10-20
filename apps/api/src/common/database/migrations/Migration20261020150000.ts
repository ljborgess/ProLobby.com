// Fase 4.2: avaliação por pares entre companheiros do mesmo lado.
import { Migration } from '@mikro-orm/migrations'

export class Migration20261020150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "peer_rating" ("id" uuid not null, "lobby_id" uuid not null, "from_account_id" uuid null, "to_account_id" uuid not null, "kind" text check ("kind" in ('thumbs_up', 'negative')) not null, "created_at" timestamptz not null, constraint "peer_rating_pkey" primary key ("id"));`,
    )
    this.addSql(
      `create index "peer_rating_to_account_id_created_at_index" on "peer_rating" ("to_account_id", "created_at");`,
    )
    this.addSql(
      `alter table "peer_rating" add constraint "peer_rating_lobby_id_from_account_id_to_account_id_unique" unique ("lobby_id", "from_account_id", "to_account_id");`,
    )
    this.addSql(
      `alter table "peer_rating" add constraint "peer_rating_lobby_id_foreign" foreign key ("lobby_id") references "lobby" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "peer_rating" add constraint "peer_rating_from_account_id_foreign" foreign key ("from_account_id") references "account" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "peer_rating" add constraint "peer_rating_to_account_id_foreign" foreign key ("to_account_id") references "account" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "peer_rating" cascade;`)
  }
}
