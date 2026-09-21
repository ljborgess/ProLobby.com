// Discord presence: whether the linked Discord is still in the server (#150, RF-060).
import { Migration } from '@mikro-orm/migrations'

export class Migration20260921130000 extends Migration {
  override async up(): Promise<void> {
    // A constant default: on Postgres 11+ this is a metadata change, not a table
    // rewrite, so it is safe on a populated `account`.
    this.addSql(
      `alter table "account" add column "discord_present" boolean not null default true, add column "discord_presence_at" timestamptz null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "account" drop column "discord_present", drop column "discord_presence_at";`,
    )
  }
}
