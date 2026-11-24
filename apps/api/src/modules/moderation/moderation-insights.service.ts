import { EntityManager, raw } from '@mikro-orm/postgresql'
import { Injectable, NotFoundException } from '@nestjs/common'

import { decryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import {
  hashGamertag,
  hashIdentity,
  readIdentityHmacSecret,
} from '../../common/security/identity-hmac'
import { Account } from '../account/account.entity'
import { ACTIVE_CHARACTER_STATES, Character } from '../character/character.entity'
import { PlatformGamertag } from '../character/platform-gamertag.entity'
import { Lobby, LobbyState } from '../lobby/lobby.entity'
import { LobbyParticipation } from '../lobby/lobby-participation.entity'
import { AuditAction, AuditEntry, recordAudit } from './audit-entry.entity'
import { ModerationCase } from './moderation-case.entity'
import { ModerationCaseType } from './moderation-case.enums'

const AUDIT_PAGE = 50
const SEARCH_LIMIT = 20
const SNOWFLAKE = /^\d{17,20}$/
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export type AuditView = {
  entries: Pick<
    AuditEntry,
    | 'id'
    | 'action'
    | 'actorId'
    | 'actorLabel'
    | 'targetAccountId'
    | 'caseId'
    | 'before'
    | 'after'
    | 'createdAt'
  >[]
  next: string | null
}

export type BetaMetric = { key: string; value: number | null; target: number; met: boolean }
export type SuccessMetric = {
  key: string
  value: number | null
  band: 'worked' | 'ambiguous' | 'failed' | null
}

export type PlayerSummary = {
  accountId: string
  characters: { name: string | null; category: string }[]
  reputation: number
  plan: string
  discordMention: string | null
}

export type PlayerDetail = PlayerSummary & {
  state: string
  planExpiresAt: Date | null
  cases: { id: string; type: string; state: string; openedAt: Date }[]
  punishments: { kind: string; openedAt: Date; decision: string | null }[]
}

/**
 * The panel's read-only views (#310, #312): the audit log, the beta and
 * success numbers, and a player lookup. Nothing here changes a row except the
 * audit entry a search leaves behind.
 *
 * What a moderator sees of a person is the same as in a case — characters,
 * reputation, history, a Discord mention — never e-mail or birth date.
 */
@Injectable()
export class ModerationInsightsService {
  private readonly encryptionKey = readEvidenceEncryptionKey()
  private readonly hmacSecret = readIdentityHmacSecret()

  constructor(private readonly em: EntityManager) {}

  /** Newest first, a page at a time; `before` is the `createdAt` of the last entry seen. */
  async audit(filter: {
    actor?: string
    action?: AuditAction
    account?: string
    before?: AuditCursor
  }): Promise<AuditView> {
    const rows = await this.em.fork().find(
      AuditEntry,
      {
        ...(filter.actor ? { actorId: filter.actor } : {}),
        ...(filter.action ? { action: filter.action } : {}),
        ...(filter.account ? { targetAccountId: filter.account } : {}),
        ...(filter.before
          ? {
              $or: [
                { createdAt: { $lt: filter.before.createdAt } },
                { createdAt: filter.before.createdAt, id: { $lt: filter.before.id } },
              ],
            }
          : {}),
      },
      { orderBy: { createdAt: 'desc', id: 'desc' }, limit: AUDIT_PAGE + 1 },
    )
    const page = rows.slice(0, AUDIT_PAGE)
    return {
      entries: page.map(
        ({
          id,
          action,
          actorId,
          actorLabel,
          targetAccountId,
          caseId,
          before,
          after,
          createdAt,
        }) => ({
          id,
          action,
          actorId,
          actorLabel: withoutOperator(actorLabel),
          targetAccountId,
          caseId,
          before,
          after,
          createdAt,
        }),
      ),
      next: rows.length > AUDIT_PAGE ? cursorOf(page[page.length - 1]!) : null,
    }
  }

  /**
   * docs/negocio/04-lancamento.md (beta exit) and 01-mercado.md (success at
   * 90 days), straight from the tables (RNF-020). A number the platform does
   * not record yet — announced nights, the strangers group, OCR, cancellations
   * caused by a bug — is `null`, shown as "no data yet", never guessed.
   */
  async metrics(now: Date = new Date()): Promise<{ beta: BetaMetric[]; success: SuccessMetric[] }> {
    const em = this.em.fork()
    const weekAgo = new Date(now.getTime() - WEEK_MS)
    // 04-lancamento.md: a completed match is one both sides confirmed — FINISHED
    // without passing through NOT_CONFIRMED. A disputed lobby stays IN_DISPUTE.
    const confirmed = { state: LobbyState.FINISHED, unconfirmedAt: null }
    const [completed, lastWeek, settled, played] = await Promise.all([
      em.count(Lobby, confirmed),
      em.count(Lobby, { ...confirmed, endedAt: { $gt: weekAgo } }),
      em.count(Lobby, { state: { $in: SETTLED } }),
      em
        .createQueryBuilder(LobbyParticipation, 'p')
        .select(['p.account', raw('count(*) as matches')])
        .join('p.lobby', 'l')
        .where({ 'l.state': LobbyState.FINISHED, 'l.unconfirmedAt': null })
        .groupBy('p.account')
        .execute<{ matches: string }[]>(),
    ])
    const undisputed = settled ? round((completed / settled) * 100) : null
    const returned = played.length
      ? round((played.filter((row) => Number(row.matches) >= 2).length / played.length) * 100)
      : null

    const beta = (
      key: string,
      value: number | null,
      target: number,
      atMost = false,
    ): BetaMetric => ({
      key,
      value,
      target,
      met: value !== null && (atMost ? value <= target : value >= target),
    })
    return {
      beta: [
        beta('matches_completed', completed, 10),
        beta('announced_night_closed', null, 1),
        beta('unannounced_night_closed', null, 1),
        beta('strangers_share', null, 50),
        beta('ocr_first_pass', null, 80),
        beta('lobbies_cancelled_by_bug', null, 0, true),
      ],
      success: [
        { key: 'matches_per_week', value: lastWeek, band: band(lastWeek, 10, 3) },
        {
          key: 'confirmed_without_dispute',
          value: undisputed,
          band: band(undisputed, 85, 70),
        },
        { key: 'returned_for_second', value: returned, band: band(returned, 40, 25) },
      ],
    }
  }

  /**
   * Finds players by a Discord id (exact), a gamertag (exact, compared by its
   * keyed hash, the only form stored) or a character name (contains). The
   * search itself is audited — what kind of term and how many came back,
   * never the term, which can be personal data.
   */
  async searchPlayers(moderatorId: string, query: string): Promise<PlayerSummary[]> {
    const term = query.trim()
    if (term.length < 2) return []
    const em = this.em.fork()
    const kind = SNOWFLAKE.test(term) ? 'discord' : 'gamertag_or_name'
    const ids = new Set<string>()
    if (kind === 'discord') {
      const found = await em.findOne(Account, {
        discordIdHash: hashIdentity(this.hmacSecret, term),
      })
      if (found) ids.add(found.id)
    } else {
      const tags = await em.find(PlatformGamertag, {
        gamertagHash: hashGamertag(this.hmacSecret, term),
      })
      for (const tag of tags) ids.add(tag.account.id)
      const named = await em.find(
        Character,
        { name: { $ilike: `%${escapeLike(term)}%` }, state: { $in: [...ACTIVE_CHARACTER_STATES] } },
        { limit: SEARCH_LIMIT },
      )
      for (const character of named) ids.add(character.account.id)
    }
    const accounts = ids.size
      ? await em.find(Account, { id: { $in: [...ids].slice(0, SEARCH_LIMIT) } })
      : []
    recordAudit(em, {
      action: AuditAction.PLAYER_SEARCHED,
      actorId: moderatorId,
      actorLabel: 'moderator',
      after: { kind, results: accounts.length },
    })
    await em.flush()
    return this.summaries(em, accounts)
  }

  async player(accountId: string): Promise<PlayerDetail> {
    const em = this.em.fork()
    const account = await em.findOne(Account, { id: accountId })
    if (!account) throw new NotFoundException('player_not_found')
    const cases = await em.find(
      ModerationCase,
      { targetAccount: accountId },
      { orderBy: { openedAt: 'desc' }, limit: 50 },
    )
    const punishments = cases.filter((c) =>
      [ModerationCaseType.SUSPENSION, ModerationCaseType.BAN].includes(c.type),
    )
    return {
      ...(await this.summaries(em, [account]))[0]!,
      state: account.state,
      planExpiresAt: account.planExpiresAt ?? null,
      cases: cases
        .filter((c) => !punishments.includes(c))
        .map(({ id, type, state, openedAt }) => ({ id, type, state, openedAt })),
      punishments: punishments.map((c) => ({
        kind: c.type,
        openedAt: c.openedAt,
        decision: c.decision ?? null,
      })),
    }
  }

  private async summaries(em: EntityManager, accounts: Account[]): Promise<PlayerSummary[]> {
    const characters = accounts.length
      ? await em.find(
          Character,
          {
            account: { $in: accounts.map((a) => a.id) },
            state: { $in: [...ACTIVE_CHARACTER_STATES] },
          },
          { orderBy: { category: 'asc' } },
        )
      : []
    return accounts.map((account) => ({
      accountId: account.id,
      characters: characters
        .filter((c) => c.account.id === account.id)
        .map((c) => ({ name: c.name ?? null, category: c.category })),
      reputation: account.reputation,
      plan: account.plan,
      discordMention: account.discordIdEncrypted
        ? `<@${decryptAtRest(this.encryptionKey, account.discordIdEncrypted).toString()}>`
        : null,
    }))
  }
}

export type AuditCursor = { createdAt: Date; id: string }

const cursorOf = (entry: AuditEntry) => `${entry.createdAt.toISOString()}_${entry.id}`

/** The CLI writes `cli:<operator e-mail>`; the panel shows who by `actorId`, never the e-mail. */
const withoutOperator = (label: string) => label.replace(/^(cli(?::bootstrap)?):.*$/, '$1')

/** A lobby whose score is in, from both sides or one, or held in a dispute. */
const SETTLED = [LobbyState.FINISHED, LobbyState.NOT_CONFIRMED, LobbyState.IN_DISPUTE]

/** 01-mercado.md: at or above `worked` worked, below `failed` failed, ambiguous between. */
function band(value: number | null, worked: number, failed: number): SuccessMetric['band'] {
  if (value === null) return null
  if (value >= worked) return 'worked'
  return value < failed ? 'failed' : 'ambiguous'
}

const round = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10)

/** A name search is a contains, so `%` and `_` the person types mean themselves. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`)
