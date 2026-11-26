import { Module } from '@nestjs/common'

import { EloDecayJob } from './elo-decay.job'
import { EloDecayService } from './elo-decay.service'
import { EloService } from './elo.service'
import { LeaderboardController } from './leaderboard.controller'
import { LeaderboardService } from './leaderboard.service'
import { MatchEloService } from './match-elo.service'
import { MatchRollbackService } from './match-rollback.service'
import { ProfileController } from './profile.controller'
import { ProfileService } from './profile.service'
import { ReputationService } from './reputation.service'
import { SuspensionEndJob } from './suspension-end.job'

/** Phase 2.4: elo and reputation, always through their event logs (#53). */
@Module({
  controllers: [LeaderboardController, ProfileController],
  providers: [
    EloService,
    EloDecayService,
    EloDecayJob,
    LeaderboardService,
    ProfileService,
    ReputationService,
    MatchEloService,
    MatchRollbackService,
    SuspensionEndJob,
  ],
  exports: [EloService, EloDecayService, ReputationService, MatchEloService, MatchRollbackService],
})
export class RankingModule {}
