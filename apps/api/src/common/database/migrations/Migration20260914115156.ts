import { Migration } from '@mikro-orm/migrations'

export class Migration20260914115156 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "terms_acceptance" add constraint "terms_acceptance_account_id_version_unique" unique ("account_id", "version");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "terms_acceptance" drop constraint "terms_acceptance_account_id_version_unique";`,
    )
  }
}
