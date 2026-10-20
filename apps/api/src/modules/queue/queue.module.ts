import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { BotIntegrationModule } from '../bot-integration/bot-integration.module'
import { RankingModule } from '../ranking/ranking.module'
import { CaptainCascadeService } from './captain-cascade.service'
import { FormationVoteService } from './formation-vote.service'
import { LobbyConfirmationService } from './lobby-confirmation.service'
import { LobbyInviteService } from './lobby-invite.service'
import { MatchPrintRetentionJob } from './match-print-retention.job'
import { MatchReportService } from './match-report.service'
import { PeerRatingService } from './peer-rating.service'
import { UserReportService } from './user-report.service'
import { QueueEntry } from './queue-entry.entity'
import { QueueMatchingJob } from './queue-matching.job'
import { QueueMatchingService } from './queue-matching.service'
import { QueueController } from './queue.controller'
import { QueueService } from './queue.service'

/** Phase 2.5 and the lobby of phase 3: queue, matchmaking, captains (#55, #56). */
@Module({
  imports: [MikroOrmModule.forFeature([QueueEntry]), RankingModule, BotIntegrationModule],
  controllers: [QueueController],
  providers: [
    CaptainCascadeService,
    FormationVoteService,
    LobbyConfirmationService,
    LobbyInviteService,
    MatchPrintRetentionJob,
    MatchReportService,
    PeerRatingService,
    UserReportService,
    QueueService,
    QueueMatchingService,
    QueueMatchingJob,
  ],
})
export class QueueModule {}
