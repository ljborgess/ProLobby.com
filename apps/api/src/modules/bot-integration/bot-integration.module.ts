import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { Clock, SystemClock } from '../../common/time/clock'
import { ModerationCase } from '../moderation/moderation-case.entity'
import { EventDelivery } from './event-delivery.entity'
import { EventDeliveryService } from './event-delivery.service'
import { WebhookClient } from './webhook-client'

@Module({
  imports: [MikroOrmModule.forFeature([EventDelivery, ModerationCase])],
  providers: [{ provide: Clock, useClass: SystemClock }, WebhookClient, EventDeliveryService],
  exports: [EventDeliveryService],
})
export class BotIntegrationModule {}
