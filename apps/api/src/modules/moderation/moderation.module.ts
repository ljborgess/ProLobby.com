import { Module } from '@nestjs/common'

import { QueueModule } from '../queue/queue.module'
import { ModerationCasesController } from './moderation-cases.controller'
import { ModerationCasesService } from './moderation-cases.service'

/** The moderation panel's case queue (#306). Verification keeps its own route in CharacterModule. */
@Module({
  imports: [QueueModule],
  controllers: [ModerationCasesController],
  providers: [ModerationCasesService],
})
export class ModerationModule {}
