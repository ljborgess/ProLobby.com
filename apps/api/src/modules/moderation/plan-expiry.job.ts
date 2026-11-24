import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { PlanService } from './plan.service'

/** #313: Supporter months not renewed end every hour. Own try/catch, like the other jobs. */
@Injectable()
export class PlanExpiryJob {
  private readonly logger = new Logger(PlanExpiryJob.name)

  constructor(private readonly plans: PlanService) {}

  @Cron(CronExpression.EVERY_HOUR, {
    timeZone: 'UTC',
    // e2e calls expire() itself; a tick mid-suite would act on its rows.
    disabled: process.env.NODE_ENV === 'test',
  })
  async run(): Promise<void> {
    try {
      const lapsed = await this.plans.expire()
      if (lapsed) this.logger.log(`supporter plans lapsed: ${lapsed}`)
    } catch (error) {
      this.logger.error(
        'failed to lapse supporter plans',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
