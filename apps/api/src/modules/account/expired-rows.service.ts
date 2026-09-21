import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { DiscordLinkState } from './discord-link-state.entity'
import { FailedSignIn } from './failed-sign-in.entity'
import { PasswordReset } from './password-reset.entity'

/**
 * Rows kept past this age after they stop meaning anything. A day, not zero: a
 * clock skew or a person clicking an old link a few minutes late still gets the
 * normal "expired" answer from the row, not a vanished one.
 */
export const EXPIRED_ROW_GRACE_MS = 24 * 60 * 60 * 1000

export interface PurgedRows {
  failedSignIns: number
  passwordResets: number
  discordLinkStates: number
}

/**
 * Deletes rows that no longer decide anything — audit of 2026-09-21.
 *
 * Nothing removed them: a failed sign-in only went away on the next successful
 * one, and a reset link or a Discord link state stayed forever after it expired.
 * On Neon's free tier (0.5 GB, ADR-009) unbounded tables are a quota problem,
 * and `failed_sign_in` grows fastest exactly when an account is under attack.
 *
 * Each cut-off is the point after which the row cannot change an answer:
 * a failed sign-in counts for FAILED_SIGN_IN_WINDOW_MS (15 min), a reset link
 * and a link state are refused once `expiresAt` passes.
 */
@Injectable()
export class ExpiredRowsService {
  constructor(private readonly em: EntityManager) {}

  async purge(now = new Date()): Promise<PurgedRows> {
    const em = this.em.fork()
    const cutoff = new Date(now.getTime() - EXPIRED_ROW_GRACE_MS)

    return {
      failedSignIns: await em.nativeDelete(FailedSignIn, { createdAt: { $lt: cutoff } }),
      passwordResets: await em.nativeDelete(PasswordReset, { expiresAt: { $lt: cutoff } }),
      discordLinkStates: await em.nativeDelete(DiscordLinkState, { expiresAt: { $lt: cutoff } }),
    }
  }
}
