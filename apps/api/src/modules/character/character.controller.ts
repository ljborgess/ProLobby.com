import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common'

import { Throttle } from '@nestjs/throttler'

import { AllowStates } from '../../common/auth/auth.decorators'
import type { RequestWithAccount } from '../../common/auth/session.guard'
import { CHARACTER_CREATE_THROTTLE } from '../../common/security/throttler.config'
import { AccountState } from '../account/account.enums'
import { CharacterService, type CharacterView } from './character.service'
import { ChangeCategoryDto } from './dto/change-category.dto'
import { CreateCharacterDto } from './dto/create-character.dto'

/**
 * Characters of the logged-in account — phase 2.2, issue #194.
 *
 * Open to an unverified email too: RF-055 accepts the prerequisites in any
 * order of arrival, the queue is what demands all of them.
 */
@Controller('characters')
@AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED)
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Get()
  list(@Req() request: RequestWithAccount): Promise<CharacterView[]> {
    return this.characterService.list(request.account!.id)
  }

  @Post()
  @Throttle(CHARACTER_CREATE_THROTTLE)
  create(
    @Req() request: RequestWithAccount,
    @Body() dto: CreateCharacterDto,
  ): Promise<CharacterView> {
    return this.characterService.create(request.account!.id, dto)
  }

  /** Only the category moves, and only with zero matches (RF-028). */
  @Patch(':id')
  changeCategory(
    @Req() request: RequestWithAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeCategoryDto,
  ): Promise<CharacterView> {
    return this.characterService.changeCategory(request.account!.id, id, dto)
  }
}
