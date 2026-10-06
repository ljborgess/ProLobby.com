import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { BlockedIdentity } from '../moderation/blocked-identity.entity'
import { ModerationCase } from '../moderation/moderation-case.entity'
import { RankingModule } from '../ranking/ranking.module'
import { CharacterVerificationService } from './character-verification.service'
import { CharacterController } from './character.controller'
import { Character } from './character.entity'
import { CharacterService } from './character.service'
import { PlatformGamertag } from './platform-gamertag.entity'
import { PrintRetentionJob } from './print-retention.job'
import { PrintSubmission } from './print-submission.entity'
import { PrintSubmissionService } from './print-submission.service'
import { VerificationController } from './verification.controller'

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Character,
      PlatformGamertag,
      PrintSubmission,
      ModerationCase,
      BlockedIdentity,
    ]),
    RankingModule,
  ],
  controllers: [CharacterController, VerificationController],
  providers: [
    CharacterService,
    CharacterVerificationService,
    PrintSubmissionService,
    PrintRetentionJob,
  ],
  exports: [CharacterService],
})
export class CharacterModule {}
