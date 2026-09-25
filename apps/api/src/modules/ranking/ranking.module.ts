import { Module } from '@nestjs/common'

import { MatchRollbackService } from './match-rollback.service'
import { ReputationService } from './reputation.service'

/** Phase 2.4: elo and reputation, always through their event logs (#53). */
@Module({
  providers: [ReputationService, MatchRollbackService],
  exports: [ReputationService, MatchRollbackService],
})
export class RankingModule {}
