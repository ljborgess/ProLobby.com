// Phase 2.2, #198: character verification by moderation. A case per received
// print, the accepted state and the causes decided at verification.
import { Migration } from '@mikro-orm/migrations'

export class Migration20260924162027 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "print_submission" drop constraint if exists "print_submission_status_check";`,
    )
    this.addSql(
      `alter table "print_submission" drop constraint if exists "print_submission_rejection_check";`,
    )

    this.addSql(
      `alter table "moderation_case" drop constraint if exists "moderation_case_type_check";`,
    )

    this.addSql(
      `alter table "print_submission" add constraint "print_submission_status_check" check("status" in ('received', 'accepted', 'rejected'));`,
    )
    this.addSql(
      `alter table "print_submission" add constraint "print_submission_rejection_check" check("rejection" in ('invalid_format', 'image_too_small', 'print_already_used', 'gamertag_mismatch', 'gamertag_unavailable', 'archetype_mismatch', 'not_active_archetype', 'unreadable'));`,
    )

    this.addSql(`alter table "moderation_case" add column "print_submission_id" uuid null;`)
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_print_submission_id_foreign" foreign key ("print_submission_id") references "print_submission" ("id") on update cascade on delete cascade;`,
    )
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_type_check" check("type" in ('score_dispute', 'ocr_exception', 'user_report', 'punishment_appeal', 'captain_abuse', 'bot_delivery_failure', 'negative_rating_threshold', 'account_recovery', 'gamertag_change', 'linked_identity_change', 'possible_game_bug', 'character_verification'));`,
    )
    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_print_submission_id_unique" unique ("print_submission_id");`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "moderation_case" drop constraint if exists "moderation_case_type_check";`,
    )

    this.addSql(
      `alter table "moderation_case" drop constraint "moderation_case_print_submission_id_foreign";`,
    )

    this.addSql(
      `alter table "print_submission" drop constraint if exists "print_submission_status_check";`,
    )
    this.addSql(
      `alter table "print_submission" drop constraint if exists "print_submission_rejection_check";`,
    )

    this.addSql(
      `alter table "moderation_case" drop constraint "moderation_case_print_submission_id_unique";`,
    )
    this.addSql(`alter table "moderation_case" drop column "print_submission_id";`)

    this.addSql(
      `alter table "moderation_case" add constraint "moderation_case_type_check" check("type" in ('score_dispute', 'ocr_exception', 'user_report', 'punishment_appeal', 'captain_abuse', 'bot_delivery_failure', 'negative_rating_threshold', 'account_recovery', 'gamertag_change', 'linked_identity_change', 'possible_game_bug'));`,
    )

    this.addSql(
      `alter table "print_submission" add constraint "print_submission_status_check" check("status" in ('received', 'rejected'));`,
    )
    this.addSql(
      `alter table "print_submission" add constraint "print_submission_rejection_check" check("rejection" in ('invalid_format', 'image_too_small', 'print_already_used'));`,
    )
  }
}
