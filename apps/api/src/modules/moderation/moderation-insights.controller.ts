import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'

import { ModeratorGuard } from '../../common/auth/moderator.guard'
import type { RequestWithAccount } from '../../common/auth/session.guard'
import { AuditAction } from './audit-entry.entity'
import {
  ModerationInsightsService,
  type AuditView,
  type BetaMetric,
  type PlayerDetail,
  type PlayerSummary,
  type SuccessMetric,
} from './moderation-insights.service'

/** The panel's read-only sections: audit, metrics, players — #312. */
@Controller('moderation')
@UseGuards(ModeratorGuard)
export class ModerationInsightsController {
  constructor(private readonly insights: ModerationInsightsService) {}

  @Get('audit')
  audit(
    @Query('actor', new ParseUUIDPipe({ optional: true })) actor?: string,
    @Query('action', new ParseEnumPipe(AuditAction, { optional: true })) action?: AuditAction,
    @Query('account', new ParseUUIDPipe({ optional: true })) account?: string,
    @Query('before') before?: string,
  ): Promise<AuditView> {
    const cursor = before ? new Date(before) : undefined
    if (cursor && Number.isNaN(cursor.getTime())) throw new BadRequestException('invalid_cursor')
    return this.insights.audit({ actor, action, account, before: cursor })
  }

  @Get('metrics')
  metrics(): Promise<{ beta: BetaMetric[]; success: SuccessMetric[] }> {
    return this.insights.metrics()
  }

  @Get('players')
  search(@Req() request: RequestWithAccount, @Query('q') query = ''): Promise<PlayerSummary[]> {
    if (query.length > 64) throw new BadRequestException('query_too_long')
    return this.insights.searchPlayers(request.account!.id, query)
  }

  @Get('players/:accountId')
  player(@Param('accountId', ParseUUIDPipe) accountId: string): Promise<PlayerDetail> {
    return this.insights.player(accountId)
  }
}
