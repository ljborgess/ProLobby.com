import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { NextRun } from '../../common/time/next-run'
import { Account } from '../account/account.entity'
import { AccountState } from '../account/account.enums'
import { ReputationService } from './reputation.service'

/**
 * Every suspension is SUSPENSION_MS (7 days) long, so one that starts while
 * the job sleeps ends long after this: no wake is needed (#333).
 */
const IDLE_CAP_MS = 6 * 60 * 60 * 1000

/** RF-074: the served suspensions, every 10 min — a 7-day penalty does not need the second. */
@Injectable()
export class SuspensionEndJob {
  private readonly logger = new Logger(SuspensionEndJob.name)
  /** Skips the ticks before the next end, so Neon can hibernate (ADR-009, #333). */
  private readonly next = new NextRun()

  constructor(
    private readonly reputationService: ReputationService,
    private readonly em: EntityManager,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES, { disabled: process.env.NODE_ENV === 'test' })
  async run(): Promise<void> {
    if (!this.next.due()) return
    try {
      const ended = await this.reputationService.endSuspensions()
      if (ended > 0) this.logger.log(`ended ${ended} suspension(s)`)
      const soonest = await this.em
        .fork()
        .findOne(
          Account,
          { state: AccountState.SUSPENDED, suspensionEndsAt: { $ne: null } },
          { orderBy: { suspensionEndsAt: 'asc' }, fields: ['suspensionEndsAt'] },
        )
      this.next.sleepUntil(soonest?.suspensionEndsAt ?? null, IDLE_CAP_MS)
    } catch (error) {
      this.logger.error(
        'failed to end suspensions',
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
