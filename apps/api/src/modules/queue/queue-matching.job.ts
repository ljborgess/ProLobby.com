import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { QueueMatchingService } from './queue-matching.service'

/**
 * #231: the queue tries to close a lobby every 5 s. Short, because a waiting
 * person feels every second and the band (RF-003) moves in whole minutes.
 */
@Injectable()
export class QueueMatchingJob {
  private readonly logger = new Logger(QueueMatchingJob.name)

  constructor(private readonly queueMatchingService: QueueMatchingService) {}

  // Off under Jest: the e2e suites drive closeMatches() themselves, and a
  // run firing mid-test would place their entries behind their backs.
  @Cron(CronExpression.EVERY_5_SECONDS, {
    disabled: process.env.NODE_ENV === 'test',
    waitForCompletion: true,
  })
  async run(): Promise<void> {
    try {
      const lobbies = await this.queueMatchingService.closeMatches()
      if (lobbies > 0) this.logger.log(`created ${lobbies} lobby(ies)`)
    } catch (error) {
      this.logger.error('failed to close matches', error instanceof Error ? error.stack : undefined)
    }
  }
}
