// Evidence attachment for account recovery — RF-025. Nullable: every case
// type other than account_recovery never sets it.
import { Migration } from '@mikro-orm/migrations'

export class Migration20260916120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "moderation_case" add column "evidence_path" text null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "moderation_case" drop column "evidence_path";`)
  }
}
