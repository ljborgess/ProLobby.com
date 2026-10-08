import { Body, Controller, Delete, Get, HttpCode, Post, Put, Req } from '@nestjs/common'

import { AllowStates } from '../../common/auth/auth.decorators'
import type { RequestWithAccount } from '../../common/auth/session.guard'
import { AccountState } from '../account/account.enums'
import { ConfirmLobbyDto } from './dto/confirm-lobby.dto'
import { JoinQueueDto } from './dto/join-queue.dto'
import { LobbyConfirmationService } from './lobby-confirmation.service'
import { QueueService, type QueueEntryView } from './queue.service'

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
  ) {}

  @Get()
  current(
    @Req() request: RequestWithAccount,
  ): Promise<{ entry: QueueEntryView | null; blockedUntil: Date | null }> {
    return this.queueService.current(request.account!.id)
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
}
