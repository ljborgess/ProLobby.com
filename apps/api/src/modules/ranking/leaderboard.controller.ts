import { Controller, Get, Param, ParseEnumPipe } from '@nestjs/common'

import { AllowStates } from '../../common/auth/auth.decorators'
import { AccountState } from '../account/account.enums'
import { CharacterCategory } from '../character/archetype'
import { LeaderboardService, type LeaderboardRow } from './leaderboard.service'

/**
 * The ranking of a category (RF-014, RF-015, #336). Public to anyone signed
 * in (03-perfil.md): no search parameter, only the category (RF-016).
 */
@Controller('rankings')
@AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED)
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get(':category')
  async top(
    @Param('category', new ParseEnumPipe(CharacterCategory)) category: CharacterCategory,
  ): Promise<{ category: CharacterCategory; rows: LeaderboardRow[] }> {
    return { category, rows: await this.leaderboard.top(category) }
  }
}
