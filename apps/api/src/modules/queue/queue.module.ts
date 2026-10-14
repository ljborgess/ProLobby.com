import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { BotIntegrationModule } from '../bot-integration/bot-integration.module'
import { RankingModule } from '../ranking/ranking.module'
import { CaptainCascadeService } from './captain-cascade.service'
import { LobbyConfirmationService } from './lobby-confirmation.service'
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
    LobbyConfirmationService,
    QueueService,
    QueueMatchingService,
    QueueMatchingJob,
  ],
})
export class QueueModule {}
