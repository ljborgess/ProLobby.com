// RF-061: mensagem em #suporte-e-denuncia abre caso na moderação.
import { Migration } from '@mikro-orm/migrations'

const BEFORE = `'score_dispute', 'ocr_exception', 'user_report', 'punishment_appeal', 'captain_abuse', 'bot_delivery_failure', 'negative_rating_threshold', 'account_recovery', 'gamertag_change', 'linked_identity_change', 'possible_game_bug', 'character_verification', 'suspension', 'ban', 'baseless_reports'`

export class Migration20261104120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "moderation_case" drop constraint if exists "moderation_case_type_check";`,
    )
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_type_check" check("type" in (${BEFORE}, 'support_request'));`,
    )
    this.addSql(`alter table "moderation_case" add column "discord_id_encrypted" bytea null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`delete from "moderation_case" where "type" = 'support_request';`)
    this.addSql(`alter table "moderation_case" drop column "discord_id_encrypted";`)
    this.addSql(
      `alter table "moderation_case" drop constraint if exists "moderation_case_type_check";`,
    )
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_type_check" check("type" in (${BEFORE}));`,
    )
  }
}
