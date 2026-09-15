// Keeps the event's own timestamp — RF-058. Until now the column did not
// exist, and every delivery attempt re-stamped `occurredAt` with the current
// time on the way out, so the instant the event actually happened was lost.
import { Migration } from '@mikro-orm/migrations'

export class Migration20260915130956 extends Migration {
  override async up(): Promise<void> {
    // Three steps instead of a single `add column ... not null`: that form
    // fails outright on a table that already has rows, and this one has to
    // apply to a database that has been taking deliveries.
    this.addSql(`alter table "event_delivery" add column "occurred_at" timestamptz null;`)
    // Best available approximation for rows written before the column: the
    // row was created when the event was enqueued, which is as close to when
    // it happened as this table ever knew.
    this.addSql(
      `update "event_delivery" set "occurred_at" = "created_at" where "occurred_at" is null;`,
    )
    this.addSql(`alter table "event_delivery" alter column "occurred_at" set not null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "event_delivery" drop column "occurred_at";`)
  }
}
