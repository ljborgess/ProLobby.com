// Separates "invalidated by a newer link" from "actually used" — 2026-09-23
// review, high severity. Before this, sendVerification()'s reissue reused
// `usedAt` to mean both, and verify() answered success for either: clicking
// an OLD link, after asking for a resend, silently returned 204 with
// `emailVerified` still false.
import { Migration } from '@mikro-orm/migrations'

export class Migration20260923120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "email_verification" add column "invalidated_at" timestamptz null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "email_verification" drop column "invalidated_at";`)
  }
}
