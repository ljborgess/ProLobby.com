import { Module } from '@nestjs/common'

import { BotIntegrationModule } from '../bot-integration/bot-integration.module'
import { QueueModule } from '../queue/queue.module'
import { ModerationCasesController } from './moderation-cases.controller'
import { ModerationCasesService } from './moderation-cases.service'
import { ModerationInsightsController } from './moderation-insights.controller'
import { ModerationInsightsService } from './moderation-insights.service'
import { ModerationPlansController } from './moderation-plans.controller'
import { PlanService } from './plan.service'

/** The moderation panel's case queue (#306). Verification keeps its own route in CharacterModule. */
@Module({
  imports: [QueueModule, BotIntegrationModule],
  controllers: [ModerationCasesController, ModerationInsightsController, ModerationPlansController],
  providers: [ModerationCasesService, ModerationInsightsService, PlanService],
})
export class ModerationModule {}
