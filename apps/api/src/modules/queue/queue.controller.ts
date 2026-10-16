import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { memoryStorage } from 'multer'

import { AllowStates } from '../../common/auth/auth.decorators'
import type { RequestWithAccount } from '../../common/auth/session.guard'
import { UPLOAD_THROTTLE } from '../../common/security/throttler.config'
import { AccountState } from '../account/account.enums'
import type { CharacterCategory } from '../character/archetype'
import { PRINT_MAX_BYTES } from '../character/print-submission.service'
import { CaptainCascadeService } from './captain-cascade.service'
import { FormationVoteService } from './formation-vote.service'
import { AnswerCaptaincyDto } from './dto/answer-captaincy.dto'
import { ConfirmLobbyDto } from './dto/confirm-lobby.dto'
import { ContestResultDto } from './dto/contest-result.dto'
import { FormationDto } from './dto/formation.dto'
import { JoinQueueDto } from './dto/join-queue.dto'
import { ReportScoreDto } from './dto/report-score.dto'
import { LobbyConfirmationService } from './lobby-confirmation.service'
import { LobbyInviteService } from './lobby-invite.service'
import { MatchReportService, type MatchReportView } from './match-report.service'
import { QueueService, type MovementBand, type QueueEntryView } from './queue.service'

/**
 * The logged-in account's place in the queue — #228, #232.
 *
 * An unverified email passes the guard so the refusal can list it with the
 * rest (RF-002). Suspended and banned stop at the guard with their state.
 */
@Controller('queue')
@AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED)
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly lobbyConfirmationService: LobbyConfirmationService,
    private readonly captainCascadeService: CaptainCascadeService,
    private readonly lobbyInviteService: LobbyInviteService,
    private readonly formationVoteService: FormationVoteService,
    private readonly matchReportService: MatchReportService,
  ) {}

  @Get()
  current(
    @Req() request: RequestWithAccount,
  ): Promise<{ entry: QueueEntryView | null; blockedUntil: Date | null }> {
    return this.queueService.current(request.account!.id)
  }

  /** RF-008: only the band per category; the count never leaves the API. */
  @Get('movement')
  movement(): Promise<Record<CharacterCategory, MovementBand>> {
    return this.queueService.movement()
  }

  @Post()
  join(@Req() request: RequestWithAccount, @Body() dto: JoinQueueDto): Promise<QueueEntryView> {
    return this.queueService.join(request.account!.id, dto.characterId)
  }

  @Delete()
  @HttpCode(204)
  leave(@Req() request: RequestWithAccount): Promise<void> {
    return this.queueService.leave(request.account!.id)
  }

  /** Accept or refuse the lobby the queue placed this account in, within 30 s. */
  @Put('confirmation')
  @HttpCode(204)
  confirm(@Req() request: RequestWithAccount, @Body() dto: ConfirmLobbyDto): Promise<void> {
    return this.lobbyConfirmationService.respond(request.account!.id, dto.accept)
  }

  /** The captain role, within its 30 s: confirm, decline, or the club filled up (#247). */
  @Put('captaincy')
  @HttpCode(204)
  answerCaptaincy(
    @Req() request: RequestWithAccount,
    @Body() dto: AnswerCaptaincyDto,
  ): Promise<void> {
    return this.captainCascadeService.respond(request.account!.id, dto.answer)
  }

  /** A confirmed captain gives the role up, before the other side confirmed (RF-032). */
  @Delete('captaincy')
  @HttpCode(204)
  withdrawCaptaincy(@Req() request: RequestWithAccount): Promise<void> {
    return this.captainCascadeService.withdraw(request.account!.id)
  }

  /** Got the invite to the captain's club, within the 5 min (#248). */
  @Put('invite')
  @HttpCode(204)
  inviteReceived(@Req() request: RequestWithAccount): Promise<void> {
    return this.lobbyInviteService.received(request.account!.id)
  }

  /** The captain: the club filled up after its last update, no fault for a missing invite (#248). */
  @Put('club-full')
  @HttpCode(204)
  declareClubFull(@Req() request: RequestWithAccount): Promise<void> {
    return this.lobbyInviteService.declareClubFull(request.account!.id)
  }

  /** A vote in the own side's formation, within the 60 s; changeable until then (#249). */
  @Put('formation-vote')
  @HttpCode(204)
  voteFormation(@Req() request: RequestWithAccount, @Body() dto: FormationDto): Promise<void> {
    return this.formationVoteService.vote(request.account!.id, dto.formation)
  }

  /** The captain settles a tie, or picks when nobody voted (#249). */
  @Put('formation')
  @HttpCode(204)
  chooseFormation(@Req() request: RequestWithAccount, @Body() dto: FormationDto): Promise<void> {
    return this.formationVoteService.choose(request.account!.id, dto.formation)
  }

  /** The result: print of the final screen and the score, by any human of the match (4.1). */
  @Post('report')
  @Throttle(UPLOAD_THROTTLE)
  @UseInterceptors(
    FileInterceptor('print', { storage: memoryStorage(), limits: { fileSize: PRINT_MAX_BYTES } }),
  )
  report(
    @Req() request: RequestWithAccount,
    @Body() dto: ReportScoreDto,
    @UploadedFile() print?: Express.Multer.File,
  ): Promise<MatchReportView> {
    if (!print) {
      throw new BadRequestException('print_required')
    }
    return this.matchReportService.submit(request.account!.id, dto, print.buffer)
  }

  /** Fixes the typed score while the other side has not reported (RF-042). */
  @Put('report')
  correctReport(
    @Req() request: RequestWithAccount,
    @Body() dto: ReportScoreDto,
  ): Promise<MatchReportView> {
    return this.matchReportService.correct(request.account!.id, dto)
  }

  /** A one-sided result is wrong: opens a dispute, once per person, within 48 h (RF-012). */
  @Post('contest')
  @HttpCode(204)
  contest(@Req() request: RequestWithAccount, @Body() dto: ContestResultDto): Promise<void> {
    return this.matchReportService.contest(request.account!.id, dto.lobbyId)
  }
}
