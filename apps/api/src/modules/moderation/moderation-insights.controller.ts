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
import { isUUID } from 'class-validator'

import { AuditAction } from './audit-entry.entity'
import {
  ModerationInsightsService,
  type AuditCursor,
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
    @Query('before') before?: unknown,
  ): Promise<AuditView> {
    return this.insights.audit({ actor, action, account, before: parseCursor(before) })
  }

  @Get('metrics')
  metrics(): Promise<{ beta: BetaMetric[]; success: SuccessMetric[] }> {
    return this.insights.metrics()
  }

  @Get('players')
  search(
    @Req() request: RequestWithAccount,
    @Query('q') query: unknown = '',
  ): Promise<PlayerSummary[]> {
    // ?q=a&q=b arrives as an array: only one plain string is a search.
    if (typeof query !== 'string') throw new BadRequestException('invalid_query')
    if (query.length > 64) throw new BadRequestException('query_too_long')
    return this.insights.searchPlayers(request.account!.id, query)
  }

  @Get('players/:accountId')
  player(@Param('accountId', ParseUUIDPipe) accountId: string): Promise<PlayerDetail> {
    return this.insights.player(accountId)
  }
}

/** `<createdAt ISO>_<id>`, the `next` of the previous page. */
function parseCursor(before: unknown): AuditCursor | undefined {
  if (before === undefined) return undefined
  const [iso, id] = typeof before === 'string' ? before.split('_') : []
  const createdAt = new Date(iso ?? '')
  if (Number.isNaN(createdAt.getTime()) || !id || !isUUID(id)) {
    throw new BadRequestException('invalid_cursor')
  }
  return { createdAt, id }
}
