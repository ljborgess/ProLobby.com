import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { ReputationService } from './reputation.service'

/** RF-074: the served suspensions, every 10 min — a 7-day penalty does not need the second. */
@Injectable()
export class SuspensionEndJob {
  private readonly logger = new Logger(SuspensionEndJob.name)

  constructor(private readonly reputationService: ReputationService) {}

  @Cron(CronExpression.EVERY_10_MINUTES, { disabled: process.env.NODE_ENV === 'test' })
  async run(): Promise<void> {
    try {
      const ended = await this.reputationService.endSuspensions()
      if (ended > 0) this.logger.log(`ended ${ended} suspension(s)`)
    } catch (error) {
      this.logger.error(
        'failed to end suspensions',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
