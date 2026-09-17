// Punishment appeal — RF-037, RF-081. Nullable: only punishment_appeal cases
// ever set these.
import { Migration } from '@mikro-orm/migrations'

export class Migration20260917100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "moderation_case" add column "appeal_message" text null;`)
    this.addSql(`alter table "moderation_case" add column "appeals_case_id" uuid null;`)
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_appeals_case_id_foreign" foreign key ("appeals_case_id") references "moderation_case" ("id") on update cascade on delete set null;`,
    )

    // One appeal per punishment, ever (RF-037) — not scoped to OPEN like the
    // account-recovery index, because a resolved or dismissed appeal still
    // counts: reopening with new evidence is a moderator action at
    // resolution time (phase 5), not a second row filed here.
    this.addSql(
      `create unique index "moderation_case_one_appeal_per_punishment_unique" on "moderation_case" ("appeals_case_id") where ("type" = 'punishment_appeal');`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index "moderation_case_one_appeal_per_punishment_unique";`)
    this.addSql(
      `alter table "moderation_case" drop constraint "moderation_case_appeals_case_id_foreign";`,
    )
    this.addSql(`alter table "moderation_case" drop column "appeals_case_id";`)
    this.addSql(`alter table "moderation_case" drop column "appeal_message";`)
  }
}
