// Evidence attachment for account recovery — RF-025. Nullable: every case
// type other than account_recovery never sets it.
import { Migration } from '@mikro-orm/migrations'

export class Migration20260916120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "moderation_case" add column "evidence_path" text null;`)

    // At most one *open* account_recovery case per account. A partial index,
    // not a check-then-insert in the service: two requests racing past a
    // count() would both pass it and both insert, which is exactly the
    // duplicate this exists to prevent. Postgres treats NULL as distinct
    // from NULL in a unique index, so this only ever constrains rows that
    // are actually an open recovery case — every other type/state combination
    // is untouched.
    this.addSql(
      `create unique index "moderation_case_open_account_recovery_unique" on "moderation_case" ("target_account_id") where ("type" = 'account_recovery' and "state" = 'open');`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index "moderation_case_open_account_recovery_unique";`)
    this.addSql(`alter table "moderation_case" drop column "evidence_path";`)
  }
}
