import { Module } from '@nestjs/common'

import { ReputationService } from './reputation.service'

/** Phase 2.4: elo and reputation, always through their event logs (#53). */
@Module({
  providers: [ReputationService],
  exports: [ReputationService],
})
export class RankingModule {}
