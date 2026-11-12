import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { Clock, SystemClock } from '../../common/time/clock'
import { AccountModule } from '../account/account.module'
import { ModerationCase } from '../moderation/moderation-case.entity'
import { BotEventsController } from './bot-events.controller'
import { CoordinationState } from './coordination-state'
import { EventDelivery } from './event-delivery.entity'
import { EventDeliveryService } from './event-delivery.service'
import { LobbyChannelsService } from './lobby-channels.service'
import { ModerationCaseAnnouncer } from './moderation-case-announcer'
import { PunishmentAnnouncer } from './punishment-announcer'
import { SupportIntakeService } from './support-intake.service'
import { WebhookClient } from './webhook-client'

@Module({
  imports: [MikroOrmModule.forFeature([EventDelivery, ModerationCase]), AccountModule],
  controllers: [BotEventsController],
  providers: [
    { provide: Clock, useClass: SystemClock },
    WebhookClient,
    CoordinationState,
    EventDeliveryService,
    LobbyChannelsService,
    ModerationCaseAnnouncer,
    PunishmentAnnouncer,
    SupportIntakeService,
  ],
  exports: [CoordinationState, EventDeliveryService, WebhookClient],
})
export class BotIntegrationModule {}
