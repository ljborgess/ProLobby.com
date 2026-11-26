import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { NextRun } from '../../common/time/next-run'
import { Account } from '../account/account.entity'
import { AccountPlan } from '../account/account.enums'
import { PlanService } from './plan.service'

/**
 * A Supporter month set while the job sleeps ends 30 days out, long after
 * this: no wake is needed (#333).
 */
const IDLE_CAP_MS = 6 * 60 * 60 * 1000

/** #313: Supporter months not renewed end every hour. Own try/catch, like the other jobs. */
@Injectable()
export class PlanExpiryJob {
  private readonly logger = new Logger(PlanExpiryJob.name)
  /** Skips the ticks before the next lapse, so Neon can hibernate (ADR-009, #333). */
  private readonly next = new NextRun()

  constructor(
    private readonly plans: PlanService,
    private readonly em: EntityManager,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, {
    timeZone: 'UTC',
    // e2e calls expire() itself; a tick mid-suite would act on its rows.
    disabled: process.env.NODE_ENV === 'test',
  })
  async run(): Promise<void> {
    if (!this.next.due()) return
    try {
      const lapsed = await this.plans.expire()
      if (lapsed) this.logger.log(`supporter plans lapsed: ${lapsed}`)
      const soonest = await this.em
        .fork()
        .findOne(
          Account,
          { plan: AccountPlan.SUPPORTER, planExpiresAt: { $ne: null } },
          { orderBy: { planExpiresAt: 'asc' }, fields: ['planExpiresAt'] },
        )
      this.next.sleepUntil(soonest?.planExpiresAt ?? null, IDLE_CAP_MS)
    } catch (error) {
      this.logger.error(
        'failed to lapse supporter plans',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
