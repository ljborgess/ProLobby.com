import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { BlockedIdentity } from '../moderation/blocked-identity.entity'
import { CharacterController } from './character.controller'
import { Character } from './character.entity'
import { CharacterService } from './character.service'
import { PlatformGamertag } from './platform-gamertag.entity'

@Module({
  imports: [MikroOrmModule.forFeature([Character, PlatformGamertag, BlockedIdentity])],
  controllers: [CharacterController],
  providers: [CharacterService],
  exports: [CharacterService],
})
export class CharacterModule {}
