// Phase 2.5, #229: the declared club, one per account (RF-006).
import { Migration } from '@mikro-orm/migrations'

export class Migration20261007123641 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "declared_club" ("id" uuid not null, "account_id" uuid not null, "free_slots" smallint not null, "club_name" varchar(20) not null, "updated_at" timestamptz not null, constraint "declared_club_pkey" primary key ("id"));`,
    )
    this.addSql(
      `alter table "declared_club" add constraint "declared_club_account_id_unique" unique ("account_id");`,
    )
    this.addSql(
      `alter table "declared_club" add constraint declared_club_free_slots_check check(free_slots >= 0 and free_slots <= 10);`,
    )

    this.addSql(
      `alter table "declared_club" add constraint "declared_club_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "declared_club" cascade;`)
  }
}
