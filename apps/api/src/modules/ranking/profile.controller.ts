import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common'

import { AllowStates } from '../../common/auth/auth.decorators'
import { AccountState } from '../account/account.enums'
import { ProfileService, type MatchHistoryItem, type PublicProfile } from './profile.service'

/**
 * Someone's public profile and match history (RF-016, RF-018, #337). By id
 * only: no route here takes a name, so there is nothing to search with.
 */
@Controller('profiles')
@AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED)
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get(':accountId')
  profile(@Param('accountId', ParseUUIDPipe) accountId: string): Promise<PublicProfile> {
    return this.profiles.profile(accountId)
  }

  @Get(':accountId/matches')
  matches(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('before', new ParseUUIDPipe({ optional: true })) before?: string,
  ): Promise<{ items: MatchHistoryItem[]; next: string | null }> {
    return this.profiles.matches(accountId, before)
  }
}
