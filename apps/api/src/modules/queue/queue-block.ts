import type { EntityManager } from '@mikro-orm/postgresql'

import { EloEvent } from '../ranking/elo-event.entity'
import { EloEventReason } from '../ranking/ranking-event.enums'
import { QueueRefusal } from './queue-refusal.entity'

const MINUTE = 60 * 1000

/** RF-009: 1st, 2nd, 3rd, 4th and later refusal. */
export const BLOCK_LADDER_MS = [5 * MINUTE, 15 * MINUTE, 30 * MINUTE, 120 * MINUTE] as const

/** RF-010: this long without a refusal and the next one is a 1st again. */
export const CLEAN_RESET_MS = 12 * 60 * MINUTE

/**
 * Until when the account cannot join the queue, or null — RF-009, RF-010.
 * Derived from the refusals every time, never stored.
 *
 * The count is a chain: each refusal climbs one step when it comes less than
 * 12 h after the previous one, and a completed match starts over. Read
 * literally, "12 h sem recusa": a refusal every 6 h keeps climbing, which a
 * sliding 12 h window would not.
 */
export function blockedUntil(
  refusals: readonly Date[],
  lastCompletedMatch: Date | null,
  now: Date,
): Date | null {
  const counted = refusals
    .filter((at) => !lastCompletedMatch || at > lastCompletedMatch)
    .map((at) => at.getTime())
    .sort((a, b) => a - b)
  let step = 0
  let previous: number | null = null
  for (const at of counted) {
    step = previous !== null && at - previous < CLEAN_RESET_MS ? step + 1 : 1
    previous = at
  }
  if (previous === null) return null
  const until = previous + BLOCK_LADDER_MS[Math.min(step, BLOCK_LADDER_MS.length) - 1]!
  return until > now.getTime() ? new Date(until) : null
}

/** The refusals and the last completed match that decide the block. */
async function historyOf(em: EntityManager, accountId: string) {
  const [refusals, lastMatch] = await Promise.all([
    // The ladder stops at the 4th step, so the last 4 refusals decide it.
    em.find(
      QueueRefusal,
      { account: accountId },
      { fields: ['createdAt'], orderBy: { createdAt: 'desc' }, limit: BLOCK_LADDER_MS.length },
    ),
    em.findOne(
      EloEvent,
      { character: { account: accountId }, reason: EloEventReason.MATCH_RESULT },
      { fields: ['createdAt'], orderBy: { createdAt: 'desc' } },
    ),
  ])
  return {
    refusals: refusals.map((refusal) => refusal.createdAt),
    lastMatch: lastMatch?.createdAt ?? null,
  }
}

/**
 * `blockedUntil` for one account, from the database. A completed match is
 * the latest elo event from a match result, in any of its characters.
 */
export async function blockedUntilFor(
  em: EntityManager,
  accountId: string,
  now: Date,
): Promise<Date | null> {
  const { refusals, lastMatch } = await historyOf(em, accountId)
  return blockedUntil(refusals, lastMatch, now)
}

/**
 * The block now, and how long refusing right now would block — the 30 s card
 * says the second before the person refuses (#234). One read of the history
 * for both: the screen asks every 2 s in that step.
 */
export async function blockStateFor(
  em: EntityManager,
  accountId: string,
  now: Date,
): Promise<{ blockedUntil: Date | null; refusalBlockMs: number }> {
  const { refusals, lastMatch } = await historyOf(em, accountId)
  return {
    blockedUntil: blockedUntil(refusals, lastMatch, now),
    refusalBlockMs: blockedUntil([...refusals, now], lastMatch, now)!.getTime() - now.getTime(),
  }
}
