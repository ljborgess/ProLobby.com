import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { CaptainCascadeService } from './captain-cascade.service'
import { FormationVoteService } from './formation-vote.service'
import { LobbyConfirmationService } from './lobby-confirmation.service'
import { LobbyInviteService } from './lobby-invite.service'
import { MatchReportService } from './match-report.service'
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
    private readonly lobbyInviteService: LobbyInviteService,
    private readonly formationVoteService: FormationVoteService,
    private readonly matchReportService: MatchReportService,
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
      const invites = await this.lobbyInviteService.expire()
      if (invites > 0) this.logger.log(`ended ${invites} invite window(s)`)
      const votes = await this.formationVoteService.close()
      if (votes > 0) this.logger.log(`counted ${votes} formation vote(s)`)
      const results = await this.matchReportService.expire()
      if (results > 0) this.logger.log(`moved ${results} result(s) past their window`)
      const lobbies = await this.queueMatchingService.closeMatches()
      if (lobbies > 0) this.logger.log(`created ${lobbies} lobby(ies)`)
    } catch (error) {
      this.logger.error('failed to run the queue', error instanceof Error ? error.stack : undefined)
    }
  }
}
