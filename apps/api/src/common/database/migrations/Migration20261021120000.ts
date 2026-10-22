// Fase 4.1: ausência reportada no report do placar (−8 quando os dois lados confirmam).
import { Migration } from '@mikro-orm/migrations'

export class Migration20261021120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "reported_absence" ("id" uuid not null, "report_id" uuid not null, "participation_id" uuid not null, constraint "reported_absence_pkey" primary key ("id"));`,
    )
    this.addSql(
      `alter table "reported_absence" add constraint "reported_absence_report_id_participation_id_unique" unique ("report_id", "participation_id");`,
    )
    this.addSql(
      `alter table "reported_absence" add constraint "reported_absence_report_id_foreign" foreign key ("report_id") references "match_report" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "reported_absence" add constraint "reported_absence_participation_id_foreign" foreign key ("participation_id") references "lobby_participation" ("id") on update cascade on delete cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "reported_absence" cascade;`)
  }
}
