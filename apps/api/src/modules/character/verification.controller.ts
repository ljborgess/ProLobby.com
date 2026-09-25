import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'

import { ModeratorGuard } from '../../common/auth/moderator.guard'
import type { RequestWithAccount } from '../../common/auth/session.guard'
import {
  CharacterVerificationService,
  type VerificationCaseView,
  type VerificationOutcome,
} from './character-verification.service'
import { VerificationDecisionDto } from './dto/verification-decision.dto'

/** Character prints waiting for a moderator — #198. */
@Controller('moderation/character-verifications')
@UseGuards(ModeratorGuard)
export class VerificationController {
  constructor(private readonly verificationService: CharacterVerificationService) {}

  @Get()
  list(@Req() request: RequestWithAccount): Promise<VerificationCaseView[]> {
    return this.verificationService.listOpen(request.account!.id)
  }

  /**
   * The print itself, decrypted per request. Never cached, never sniffed into
   * something else, never a download link that could leak out of the panel.
   */
  @Get(':caseId/print')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Disposition', 'inline')
  async print(
    @Req() request: RequestWithAccount,
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Res() response: Response,
  ): Promise<void> {
    const { bytes, type } = await this.verificationService.printFor(request.account!.id, caseId)
    response.type(type).send(bytes)
  }

  @Post(':caseId/decisions')
  decide(
    @Req() request: RequestWithAccount,
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: VerificationDecisionDto,
  ): Promise<VerificationOutcome> {
    return this.verificationService.decide(request.account!.id, caseId, dto)
  }
}
