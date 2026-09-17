import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { EmailVerificationService } from './email-verification.service'

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

  constructor(private readonly emailVerificationService: EmailVerificationService) {}

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
}
