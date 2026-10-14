import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { CaptainCascadeService } from './captain-cascade.service'
import { LobbyConfirmationService } from './lobby-confirmation.service'
import { QueueMatchingService } from './queue-matching.service'

/**
 * #231, #232: every 5 s the queue undoes the lobbies whose 30 s ran out, then
 * tries to close new ones — in that order, so whoever went back to searching
 * can be placed in the same run. Short, because a waiting person feels every
 * second and the band (RF-003) moves in whole minutes.
 */
@Injectable()
export class QueueMatchingJob {
  private readonly logger = new Logger(QueueMatchingJob.name)

  constructor(
    private readonly lobbyConfirmationService: LobbyConfirmationService,
    private readonly captainCascadeService: CaptainCascadeService,
    private readonly queueMatchingService: QueueMatchingService,
  ) {}

  // Off under Jest: the e2e suites drive the services themselves, and a run
  // firing mid-test would act on their entries behind their backs.
  @Cron(CronExpression.EVERY_5_SECONDS, {
    disabled: process.env.NODE_ENV === 'test',
    waitForCompletion: true,
  })
  async run(): Promise<void> {
    try {
      const undone = await this.lobbyConfirmationService.expire()
      if (undone > 0) this.logger.log(`undid ${undone} lobby(ies) past the 30 s`)
      const captains = await this.captainCascadeService.tick()
      if (captains > 0) this.logger.log(`moved ${captains} captain step(s)`)
      const lobbies = await this.queueMatchingService.closeMatches()
      if (lobbies > 0) this.logger.log(`created ${lobbies} lobby(ies)`)
    } catch (error) {
      this.logger.error('failed to run the queue', error instanceof Error ? error.stack : undefined)
    }
  }
}
