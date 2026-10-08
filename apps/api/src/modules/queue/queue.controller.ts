import { Body, Controller, Delete, Get, HttpCode, Post, Req } from '@nestjs/common'

import { AllowStates } from '../../common/auth/auth.decorators'
import type { RequestWithAccount } from '../../common/auth/session.guard'
import { AccountState } from '../account/account.enums'
import { JoinQueueDto } from './dto/join-queue.dto'
import { QueueService, type QueueEntryView } from './queue.service'

/**
 * The logged-in account's place in the queue — #228.
 *
 * An unverified email passes the guard so the refusal can list it with the
 * rest (RF-002). Suspended and banned stop at the guard with their state.
 */
@Controller('queue')
@AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  async current(@Req() request: RequestWithAccount): Promise<{ entry: QueueEntryView | null }> {
    return { entry: await this.queueService.current(request.account!.id) }
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
}
