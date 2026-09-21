import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { AccountRecoveryService } from './account-recovery.service'
import { EmailVerificationService } from './email-verification.service'
import { ExpiredRowsService } from './expired-rows.service'

/**
 * `@nestjs/schedule` is pinned to `^6.1.3`, not latest: v12 dropped CommonJS
 * (`"type": "module"`), and ts-jest here runs everything as CommonJS — the
 * package fails to load under the test suite. 6.1.3 is the last line built
 * for Nest 10/11 (this project's major) before that jump; there is no 7-11
 * for this package; it went straight to 12 to match Nest's own numbering.
 *
 * Daily account-maintenance jobs — issue #106.
 *
 * `EmailVerificationService.deleteExpiredUnverified()` shipped in #105,
 * tested and working, with nothing calling it — the 30-day deletion (ADR-008)
 * existed in code and never happened. This job is that caller.
 *
 * Single-instance premise: today there is exactly one API process (one VM,
 * ADR-009). A second instance would run this at the same moment too — the
 * delete itself is harmless (an already-deleted row is a no-op), but the log
 * line would double-count. Worth a lock only if a second instance ever
 * exists; not now (YAGNI).
 */
@Injectable()
export class AccountCleanupJob {
  private readonly logger = new Logger(AccountCleanupJob.name)

  constructor(
    private readonly emailVerificationService: EmailVerificationService,
    private readonly accountRecoveryService: AccountRecoveryService,
    private readonly expiredRowsService: ExpiredRowsService,
  ) {}

  /**
   * Runs once a day, in UTC (RNF-017) — the exact hour does not matter, only
   * that it is fixed and does not drift with wherever the process happens to
   * run.
   *
   * Always logs the count, including zero: a cleanup nobody can see is a
   * cleanup nobody notices failing (the exact reasoning that got this job
   * written in the first place — see #105's review).
   *
   * Never throws: a failed run must not crash the process or block whatever
   * other job is scheduled next to it. It just tries again tomorrow.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'UTC' })
  async deleteExpiredUnverifiedAccounts(): Promise<void> {
    try {
      const removed = await this.emailVerificationService.deleteExpiredUnverified()
      this.logger.log(`deleted ${removed} unverified account(s) past the 30-day deadline`)
    } catch (error) {
      this.logger.error(
        'failed to delete expired unverified accounts',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }

  /**
   * The 90-day retention of an attached screenshot (LGPD policy).
   *
   * **Provisional**, and a separate method rather than a second step of the one
   * above: ADR-009 puts this rule on the storage bucket, which deletes without
   * any job running. It lives here only until phase 2.2 wires that bucket up,
   * because the first internal deploy (#121) comes earlier and would otherwise
   * keep real screenshots with no deadline at all. When the bucket lands, this
   * method is deleted, not migrated.
   *
   * Its own try/catch and its own schedule entry, so a failure here neither
   * hides nor blocks the account deletion above.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, { timeZone: 'UTC' })
  async deleteExpiredEvidence(): Promise<void> {
    try {
      const deleted = await this.accountRecoveryService.deleteExpiredEvidence()
      this.logger.log(`deleted ${deleted} screenshot(s) past the 90-day retention`)
    } catch (error) {
      this.logger.error(
        'failed to delete expired evidence screenshots',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }

  /**
   * Sign-in attempts, reset links and Discord link states past their use —
   * audit of 2026-09-21. Same shape as the two above: own schedule, own
   * try/catch, count always logged.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { timeZone: 'UTC' })
  async purgeExpiredRows(): Promise<void> {
    try {
      const purged = await this.expiredRowsService.purge()
      this.logger.log(
        `purged ${purged.failedSignIns} failed sign-in(s), ${purged.passwordResets} reset link(s), ${purged.discordLinkStates} Discord link state(s)`,
      )
    } catch (error) {
      this.logger.error(
        'failed to purge expired rows',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
