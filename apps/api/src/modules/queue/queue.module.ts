import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { RankingModule } from '../ranking/ranking.module'
import { QueueEntry } from './queue-entry.entity'
import { QueueController } from './queue.controller'
import { QueueService } from './queue.service'

/** Phase 2.5: queue and matchmaking (#55). */
@Module({
  imports: [MikroOrmModule.forFeature([QueueEntry]), RankingModule],
  controllers: [QueueController],
  providers: [QueueService],
})
export class QueueModule {}
