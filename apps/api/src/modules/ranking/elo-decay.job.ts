import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { EloDecayService } from './elo-decay.service'

/** RF-017, once a day in UTC, same shape as the retention jobs: own try/catch. */
@Injectable()
export class EloDecayJob {
  private readonly logger = new Logger(EloDecayJob.name)

  constructor(private readonly eloDecayService: EloDecayService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM, { timeZone: 'UTC' })
  async run(): Promise<void> {
    try {
      const cuts = await this.eloDecayService.decay()
      this.logger.log(`applied ${cuts} inactivity decay cut(s)`)
    } catch (error) {
      this.logger.error(
        'failed to apply inactivity decay',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
