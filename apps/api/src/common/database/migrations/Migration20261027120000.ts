// #250: bot event payloads are encrypted at rest (RNF-009), since
// lobby.closed carries the Discord ids of the whole lobby.
//
// Existing rows go: SQL has no key to encrypt their jsonb. Nothing is
// deployed yet (#121), so all that is lost is delivery history of the
// development and test databases.
import { Migration } from '@mikro-orm/migrations'

export class Migration20261027120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`delete from "event_delivery";`)
    this.addSql(`alter table "event_delivery" drop column "payload";`)
    this.addSql(`alter table "event_delivery" add column "payload_encrypted" bytea not null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`delete from "event_delivery";`)
    this.addSql(`alter table "event_delivery" drop column "payload_encrypted";`)
    this.addSql(`alter table "event_delivery" add column "payload" jsonb not null;`)
  }
}
