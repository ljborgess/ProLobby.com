// Fase 4.2: escada de punição — suspensão e banimento automáticos viram caso.
import { Migration } from '@mikro-orm/migrations'

const BEFORE = `'score_dispute', 'ocr_exception', 'user_report', 'punishment_appeal', 'captain_abuse', 'bot_delivery_failure', 'negative_rating_threshold', 'account_recovery', 'gamertag_change', 'linked_identity_change', 'possible_game_bug', 'character_verification'`

export class Migration20261020120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "moderation_case" drop constraint if exists "moderation_case_type_check";`,
    )
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_type_check" check("type" in (${BEFORE}, 'suspension', 'ban'));`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "moderation_case" drop constraint if exists "moderation_case_type_check";`,
    )
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_type_check" check("type" in (${BEFORE}));`,
    )
  }
}
