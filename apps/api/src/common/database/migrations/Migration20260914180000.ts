// Event delivery log — RF-058 / issue #95. Data model: docs/requisitos/03-dados.md#entregaevento.
import { Migration } from '@mikro-orm/migrations'

export class Migration20260914180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "event_delivery" ("id" uuid not null, "event_id" uuid not null, "type" varchar(64) not null, "payload" jsonb not null, "target_kind" text check ("target_kind" in ('lobby', 'account', 'system')) not null, "target_id" uuid null, "attempts" smallint not null default 0, "delivered_at" timestamptz null, "next_attempt_at" timestamptz null, "created_at" timestamptz not null, constraint "event_delivery_pkey" primary key ("id"));`,
    )
    this.addSql(
      `alter table "event_delivery" add constraint "event_delivery_event_id_unique" unique ("event_id");`,
    )
    this.addSql(
      `create index "event_delivery_next_attempt_at_index" on "event_delivery" ("next_attempt_at");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "event_delivery" cascade;`)
  }
}
