import { Module } from '@nestjs/common'

import { EloDecayJob } from './elo-decay.job'
import { EloDecayService } from './elo-decay.service'
import { EloService } from './elo.service'
import { MatchRollbackService } from './match-rollback.service'
import { ReputationService } from './reputation.service'
import { SuspensionEndJob } from './suspension-end.job'

/** Phase 2.4: elo and reputation, always through their event logs (#53). */
@Module({
  providers: [
    EloService,
    EloDecayService,
    EloDecayJob,
    ReputationService,
    MatchRollbackService,
    SuspensionEndJob,
  ],
  exports: [EloService, EloDecayService, ReputationService, MatchRollbackService],
})
export class RankingModule {}
