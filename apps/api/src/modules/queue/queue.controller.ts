import { Body, Controller, Delete, Get, HttpCode, Post, Put, Req } from '@nestjs/common'

import { AllowStates } from '../../common/auth/auth.decorators'
import type { RequestWithAccount } from '../../common/auth/session.guard'
import { AccountState } from '../account/account.enums'
import type { CharacterCategory } from '../character/archetype'
import { CaptainCascadeService } from './captain-cascade.service'
import { AnswerCaptaincyDto } from './dto/answer-captaincy.dto'
import { ConfirmLobbyDto } from './dto/confirm-lobby.dto'
import { JoinQueueDto } from './dto/join-queue.dto'
import { LobbyConfirmationService } from './lobby-confirmation.service'
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
}
