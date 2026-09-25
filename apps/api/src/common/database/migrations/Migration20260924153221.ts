// Phase 2.2, #195: every verification print attempt, with its hash (RF-063).
import { Migration } from '@mikro-orm/migrations'

export class Migration20260924153221 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "print_submission" ("id" uuid not null, "account_id" uuid null, "character_id" uuid null, "file_hash" varchar(64) null, "file_path" text null, "status" text check ("status" in ('received', 'rejected')) not null, "rejection" text check ("rejection" in ('invalid_format', 'image_too_small', 'print_already_used')) null, "created_at" timestamptz not null, constraint "print_submission_pkey" primary key ("id"));`,
    )
    this.addSql(
      `alter table "print_submission" add constraint "print_submission_file_hash_unique" unique ("file_hash");`,
    )
    this.addSql(
      `create index "print_submission_account_id_created_at_index" on "print_submission" ("account_id", "created_at");`,
    )

    this.addSql(
      `alter table "print_submission" add constraint "print_submission_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete set null;`,
    )
    this.addSql(
      `alter table "print_submission" add constraint "print_submission_character_id_foreign" foreign key ("character_id") references "character" ("id") on update cascade on delete set null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "print_submission" cascade;`)
  }
}
