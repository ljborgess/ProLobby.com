import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { CharacterController } from './character.controller'
import { Character } from './character.entity'
import { CharacterService } from './character.service'
import { PlatformGamertag } from './platform-gamertag.entity'
import { PrintRetentionJob } from './print-retention.job'
import { PrintSubmission } from './print-submission.entity'
import { PrintSubmissionService } from './print-submission.service'

@Module({
  imports: [MikroOrmModule.forFeature([Character, PlatformGamertag, PrintSubmission])],
  controllers: [CharacterController],
  providers: [CharacterService, PrintSubmissionService, PrintRetentionJob],
  exports: [CharacterService],
})
export class CharacterModule {}
