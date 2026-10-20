import type { EntityManager } from '@mikro-orm/postgresql'

import type { Account } from '../account/account.entity'
import { AccountState } from '../account/account.enums'
import { PlatformGamertag } from '../character/platform-gamertag.entity'
import { BlockedIdentity } from '../moderation/blocked-identity.entity'
import { ModerationCase } from '../moderation/moderation-case.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseState,
  ModerationCaseType,
} from '../moderation/moderation-case.enums'
import { QueueEntry } from '../queue/queue-entry.entity'
import type { ReputationBand } from './reputation.service'

const DAY_MS = 24 * 60 * 60 * 1000
/** docs/produto/02-jogador/02-ranking.md, "Escada de punição". */
export const SUSPENSION_MS = 7 * DAY_MS
/** RF-038: a second suspension inside this window is a ban. */
export const REPEAT_SUSPENSION_WINDOW_MS = 180 * DAY_MS

/**
 * The punishment ladder, on the way down only — phase 4.2. Crossing under 40
 * suspends for 7 days, or bans when another suspension stands in the last
 * 180 days (RF-038); crossing under 25 bans. It is the crossing that
 * punishes, never the current value (RF-074): an account back from a
 * suspension at 45 is not suspended again for being low.
 *
 * Each punishment is a moderation case born resolved: nobody has to act on
 * it, and it is what an appeal points at (RF-037, #160). An appeal granted by
 * moderation dismisses the suspension case, so it stops counting for RF-038.
 *
 * Run by the reputation writer, inside the caller's transaction, with the
 * account lock held. A match in progress is never touched: only the search
 * goes, the next queue is what the punishment blocks.
 */
export async function punishIn(
  em: EntityManager,
  account: Account,
  crossed: { from: ReputationBand; to: ReputationBand } | null,
  now: Date,
): Promise<void> {
  if (!crossed || account.state === AccountState.BANNED || account.state === AccountState.DELETED) {
    return
  }
  if (crossed.to === 'ban') {
    return ban(em, account, 'Banimento automático: reputação abaixo de 25.', now)
  }
  // Into the suspension band from above it; coming up from the ban band is no crossing down.
  if (crossed.to !== 'suspension' || crossed.from === 'ban') return
  // Already serving one: a thumbs-up and a drop inside the 7 days are no second suspension.
  if (account.state === AccountState.SUSPENDED) return

  const standing = await em.count(ModerationCase, {
    type: ModerationCaseType.SUSPENSION,
    targetAccount: account,
    state: ModerationCaseState.RESOLVED,
    openedAt: { $gt: new Date(now.getTime() - REPEAT_SUSPENSION_WINDOW_MS) },
  })
  if (standing > 0) {
    return ban(em, account, 'Banimento automático: segunda suspensão em 180 dias.', now)
  }
  closedCase(
    em,
    account,
    ModerationCaseType.SUSPENSION,
    'Suspensão automática de 7 dias: reputação abaixo de 40.',
    now,
  )
  account.state = AccountState.SUSPENDED
  account.suspensionEndsAt = new Date(now.getTime() + SUSPENSION_MS)
  // ponytail: account lock, then the searching entry — the matcher takes the
  // entry, then the account (the participation's foreign key). Today nobody
  // searching gets punished (zero-report hits a lobby, thumbs-up goes up);
  // the disconnect slice must punish before the account can search again.
  await em.nativeDelete(QueueEntry, { account, lobby: null })
}

/** Terminal, and the identity stays barred after an LGPD deletion (RF-079). */
async function ban(
  em: EntityManager,
  account: Account,
  decision: string,
  now: Date,
): Promise<void> {
  const banCase = closedCase(em, account, ModerationCaseType.BAN, decision, now)
  account.state = AccountState.BANNED
  account.suspensionEndsAt = undefined
  await em.nativeDelete(QueueEntry, { account, lobby: null })

  if (
    account.discordIdHash &&
    !(await em.count(BlockedIdentity, { discordIdHash: account.discordIdHash }))
  ) {
    em.create(BlockedIdentity, {
      discordIdHash: account.discordIdHash,
      reason: decision,
      case: banCase,
    })
  }
  const tags = await em.find(PlatformGamertag, { account, verifiedAt: { $ne: null } })
  for (const tag of tags) {
    if (await em.count(BlockedIdentity, { platform: tag.platform, gamertagHash: tag.gamertagHash }))
      continue
    em.create(BlockedIdentity, {
      platform: tag.platform,
      gamertagHash: tag.gamertagHash,
      reason: decision,
      case: banCase,
    })
  }
}

function closedCase(
  em: EntityManager,
  account: Account,
  type: ModerationCaseType.SUSPENSION | ModerationCaseType.BAN,
  decision: string,
  now: Date,
): ModerationCase {
  return em.create(ModerationCase, {
    type,
    origin: ModerationCaseOrigin.SYSTEM,
    state: ModerationCaseState.RESOLVED,
    targetAccount: account,
    decision,
    openedAt: now,
    resolvedAt: now,
  })
}
