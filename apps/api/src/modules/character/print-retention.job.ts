import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { PrintSubmissionService } from './print-submission.service'

/**
 * The 90-day retention of character prints (LGPD policy), same shape as the
 * account-recovery evidence job: provisional until the storage bucket of
 * ADR-009 deletes by lifecycle, own schedule, own try/catch.
 */
@Injectable()
export class PrintRetentionJob {
  private readonly logger = new Logger(PrintRetentionJob.name)

  constructor(private readonly printSubmissionService: PrintSubmissionService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'UTC' })
  async deleteExpiredPrints(): Promise<void> {
    try {
      const deleted = await this.printSubmissionService.deleteExpiredFiles()
      this.logger.log(`deleted ${deleted} print(s) past the 90-day retention`)
    } catch (error) {
      this.logger.error(
        'failed to delete expired character prints',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
