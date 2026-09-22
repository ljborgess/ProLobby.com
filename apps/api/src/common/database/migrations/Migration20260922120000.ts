// Linked-identity-change case type — RF-082 / #155.
import { Migration } from '@mikro-orm/migrations'

const TYPES_BEFORE = `'score_dispute', 'ocr_exception', 'user_report', 'punishment_appeal', 'captain_abuse', 'bot_delivery_failure', 'negative_rating_threshold', 'account_recovery', 'gamertag_change', 'possible_game_bug'`

const TYPES_AFTER = `${TYPES_BEFORE}, 'linked_identity_change'`

export class Migration20260922120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "moderation_case" drop constraint if exists "moderation_case_type_check";`,
    )
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_type_check" check ("type" in (${TYPES_AFTER}));`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "moderation_case" drop constraint if exists "moderation_case_type_check";`,
    )
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_type_check" check ("type" in (${TYPES_BEFORE}));`,
    )
  }
}
