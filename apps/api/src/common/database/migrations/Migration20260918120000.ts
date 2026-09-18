// A Discord ID stops being stored in plain text — item 5 of the security
// checklist / RNF-009, and the data model decision of 2026-09-11.
import { Migration } from '@mikro-orm/migrations'

/**
 * `account.discord_id` was created as `varchar(32)` in plain text
 * (Migration20260911140926), which contradicts RNF-009: a Discord ID never sits
 * readable at rest. The data model had already resolved the conflict between
 * that rule and the column also being a key — hash for identity, ciphertext for
 * display — and the API schema simply never followed.
 *
 * Dropped rather than migrated, because the column was never written: the OAuth2
 * flow that fills it is the work this migration belongs to, so there is no row to
 * preserve and no expand-contract to stage. Doing it in any later phase would
 * mean backfilling live links instead.
 */
export class Migration20260918120000 extends Migration {
  override async up(): Promise<void> {
    // Dropping the column takes `account_discord_id_unique` with it — Postgres
    // removes a constraint whose only column is gone.
    this.addSql(`alter table "account" drop column "discord_id";`)

    this.addSql(
      `alter table "account" add column "discord_id_hash" varchar(64) null, add column "discord_id_encrypted" bytea null;`,
    )

    // Same width and same name shape as `blocked_identity.discord_id_hash`: the
    // two columns hold the output of the same HMAC and get compared to each
    // other, so they are one type, not two that happen to match today.
    this.addSql(
      `alter table "account" add constraint "account_discord_id_hash_unique" unique ("discord_id_hash");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "account" drop column "discord_id_hash";`)
    this.addSql(`alter table "account" drop column "discord_id_encrypted";`)
    this.addSql(`alter table "account" add column "discord_id" varchar(32) null;`)
    this.addSql(
      `alter table "account" add constraint "account_discord_id_unique" unique ("discord_id");`,
    )
  }
}
