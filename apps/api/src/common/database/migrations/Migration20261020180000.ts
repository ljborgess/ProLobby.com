// Fase 4.2: denúncia de quem jogou com você (RF-068, RF-069).
import { Migration } from '@mikro-orm/migrations'

const BEFORE = `'score_dispute', 'ocr_exception', 'user_report', 'punishment_appeal', 'captain_abuse', 'bot_delivery_failure', 'negative_rating_threshold', 'account_recovery', 'gamertag_change', 'linked_identity_change', 'possible_game_bug', 'character_verification', 'suspension', 'ban'`

export class Migration20261020180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "moderation_case" drop constraint if exists "moderation_case_type_check";`,
    )
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_type_check" check("type" in (${BEFORE}, 'baseless_reports'));`,
    )
    this.addSql(
      `alter table "moderation_case" add column "report_reason" text check ("report_reason" in ('fraud', 'disconnect', 'behavior')) null, add column "report_message" text null;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "moderation_case" drop column "report_reason", drop column "report_message";`,
    )
    this.addSql(
      `alter table "moderation_case" drop constraint if exists "moderation_case_type_check";`,
    )
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_type_check" check("type" in (${BEFORE}));`,
    )
  }
}
