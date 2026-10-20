import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { memoryStorage } from 'multer'

import { AllowStates } from '../../common/auth/auth.decorators'
import type { RequestWithAccount } from '../../common/auth/session.guard'
import { CHARACTER_CREATE_THROTTLE, UPLOAD_THROTTLE } from '../../common/security/throttler.config'
import { AccountState } from '../account/account.enums'
import { archetypeOptions, type ArchetypeOption } from './archetype'
import { CharacterService, type CharacterListItem, type CharacterView } from './character.service'
import { ChangeCategoryDto } from './dto/change-category.dto'
import { CreateCharacterDto } from './dto/create-character.dto'
import {
  PRINT_MAX_BYTES,
  PrintSubmissionService,
  type PrintSubmissionView,
} from './print-submission.service'

/**
 * Characters of the logged-in account — phase 2.2, issues #194 and #195.
 *
 * Open to an unverified email too: RF-055 accepts the prerequisites in any
 * order of arrival, the queue is what demands all of them.
 */
@Controller('characters')
@AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED)
export class CharacterController {
  constructor(
    private readonly characterService: CharacterService,
    private readonly printSubmissionService: PrintSubmissionService,
  ) {}

  @Get()
  list(@Req() request: RequestWithAccount): Promise<CharacterListItem[]> {
    return this.characterService.list(request.account!.id)
  }

  /** One source for the archetype × category table: the screen reads it here. */
  @Get('archetypes')
  archetypes(): ArchetypeOption[] {
    return archetypeOptions()
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

  /**
   * The verification print. A rejection is a 201 with the cause, not an
   * error: the attempt happened, counts toward RF-065, and the screen shows
   * what to redo (RF-029).
   */
  @Post(':id/prints')
  @Throttle(UPLOAD_THROTTLE)
  @UseInterceptors(
    FileInterceptor('print', { storage: memoryStorage(), limits: { fileSize: PRINT_MAX_BYTES } }),
  )
  submitPrint(
    @Req() request: RequestWithAccount,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() print?: Express.Multer.File,
    @Body('activeArchetypeConfirmed') activeArchetypeConfirmed?: string,
  ): Promise<PrintSubmissionView> {
    if (!print) {
      throw new BadRequestException('print_required')
    }
    // #197: OCR cannot see the ✓ of the active archetype, so the player says it.
    if (activeArchetypeConfirmed !== 'true') {
      throw new BadRequestException('active_archetype_confirmation_required')
    }
    return this.printSubmissionService.submit(request.account!.id, id, print.buffer)
  }
}
