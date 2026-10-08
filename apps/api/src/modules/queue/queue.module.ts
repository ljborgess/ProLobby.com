import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { RankingModule } from '../ranking/ranking.module'
import { QueueEntry } from './queue-entry.entity'
import { QueueMatchingJob } from './queue-matching.job'
import { QueueMatchingService } from './queue-matching.service'
import { QueueController } from './queue.controller'
import { QueueService } from './queue.service'

/** Phase 2.5: queue and matchmaking (#55). */
@Module({
  imports: [MikroOrmModule.forFeature([QueueEntry]), RankingModule],
  controllers: [QueueController],
  providers: [QueueService, QueueMatchingService, QueueMatchingJob],
})
export class QueueModule {}
