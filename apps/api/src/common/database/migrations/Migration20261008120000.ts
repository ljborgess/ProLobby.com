// ADR-007 revisto em 2026-10-08: redefinir a senha encerra as sessões abertas.
import { Migration } from '@mikro-orm/migrations'

export class Migration20261008120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "account" add column "sessions_valid_from" timestamptz null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "account" drop column "sessions_valid_from";`)
  }
}
