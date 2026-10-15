import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { MatchReportService } from './match-report.service'

/** The 90-day retention of result prints, same shape as `PrintRetentionJob`. */
@Injectable()
export class MatchPrintRetentionJob {
  private readonly logger = new Logger(MatchPrintRetentionJob.name)

  constructor(private readonly matchReportService: MatchReportService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'UTC' })
  async deleteExpiredPrints(): Promise<void> {
    try {
      const deleted = await this.matchReportService.deleteExpiredFiles()
      this.logger.log(`deleted ${deleted} result print(s) past the 90-day retention`)
    } catch (error) {
      this.logger.error(
        'failed to delete expired result prints',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
