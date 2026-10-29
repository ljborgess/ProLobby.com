// #209: the elo frozen at queue entry travels to the lobby, since the queue
// entry is deleted once the match settles and RF-077 averages this value.
//
// Existing rows get the baseline: nothing is deployed yet (#121).
import { Migration } from '@mikro-orm/migrations'

export class Migration20261028120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "lobby_participation" add column "elo_at_entry" integer not null default 1000;`,
    )
    this.addSql(`alter table "lobby_participation" alter column "elo_at_entry" drop default;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "lobby_participation" drop column "elo_at_entry";`)
  }
}
