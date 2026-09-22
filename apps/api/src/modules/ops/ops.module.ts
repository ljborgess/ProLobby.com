import { Module } from '@nestjs/common'

import { Clock, SystemClock } from '../../common/time/clock'
import { BotIntegrationModule } from '../bot-integration/bot-integration.module'
import { NeonConsumptionClient } from './neon-consumption.client'
import { QuotaAlertJob } from './quota-alert.job'

@Module({
  imports: [BotIntegrationModule],
  providers: [{ provide: Clock, useClass: SystemClock }, NeonConsumptionClient, QuotaAlertJob],
})
export class OpsModule {}
