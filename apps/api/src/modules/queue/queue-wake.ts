import type { EntityManager } from '@mikro-orm/postgresql'
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common'
import { finalize, type Observable } from 'rxjs'

import { NextRun } from '../../common/time/next-run'
import { Lobby, LobbyState, TERMINAL_LOBBY_STATES } from '../lobby/lobby.entity'
import {
  CONFIRMATION_WINDOW_MS as RESULT_CONFIRMATION_MS,
  CONTEST_WINDOW_MS,
  ZERO_REPORT_MS,
} from './match-report.service'
import { QueueEntry } from './queue-entry.entity'

/** The queue job's clock (#333): shared with the interceptor that wakes it. */
@Injectable()
export class QueueWake extends NextRun {}

/**
 * Wakes the queue job after every call to the queue's routes: that is where
 * new work starts (joining, a report, a vote). After the handler, not before:
 * a tick between the wake and the commit would see nothing and sleep again.
 */
@Injectable()
export class QueueWakeInterceptor implements NestInterceptor {
  constructor(private readonly wake: QueueWake) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(finalize(() => this.wake.wake()))
  }
}

/** The lobby steps that count in seconds: while one runs, the job runs every tick. */
const SHORT_STATES = [
  LobbyState.WAITING_PLAYERS,
  LobbyState.WAITING_CAPTAIN,
  LobbyState.WAITING_INVITE,
]

/**
 * When the queue job next has work (#333): `now` while anyone searches or a
 * step counts in seconds; else the earliest of the long result deadlines
 * (60 min without a report, 15 min to confirm, 48 h to contest); null when
 * nothing waits. A dispute is not here: moderation settles it, not the clock.
 */
export async function nextQueueWork(em: EntityManager, now: Date): Promise<Date | null> {
  if (await em.count(QueueEntry, { lobby: null })) return now
  const short = await em.count(Lobby, {
    $or: [
      { state: { $in: SHORT_STATES } },
      {
        formationVoteStartedAt: { $ne: null },
        formationVoteClosedAt: null,
        state: { $nin: [...TERMINAL_LOBBY_STATES] },
      },
    ],
  })
  if (short) return now

  const earliest = async (
    state: LobbyState,
    field: 'closedAt' | 'firstReportAt' | 'unconfirmedAt',
    windowMs: number,
  ): Promise<number> => {
    const lobby = await em.findOne(
      Lobby,
      { state, [field]: { $ne: null } },
      { orderBy: { [field]: 'asc' }, fields: [field] },
    )
    const at = lobby?.[field]
    return at ? at.getTime() + windowMs : Infinity
  }
  const next = Math.min(
    await earliest(LobbyState.IN_PROGRESS, 'closedAt', ZERO_REPORT_MS),
    await earliest(LobbyState.AWAITING_CONFIRMATION, 'firstReportAt', RESULT_CONFIRMATION_MS),
    await earliest(LobbyState.NOT_CONFIRMED, 'unconfirmedAt', CONTEST_WINDOW_MS),
  )
  return Number.isFinite(next) ? new Date(next) : null
}
