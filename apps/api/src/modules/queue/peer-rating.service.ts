import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'

import { isUniqueViolation } from '../../common/database/postgres-error'
import { decryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import { Account } from '../account/account.entity'
import { PlatformGamertag } from '../character/platform-gamertag.entity'
import { LobbyParticipation } from '../lobby/lobby-participation.entity'
import { Lobby, LobbyState } from '../lobby/lobby.entity'
import { PeerRating, PeerRatingKind } from '../lobby/peer-rating.entity'
import { ModerationCase } from '../moderation/moderation-case.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseState,
  ModerationCaseType,
} from '../moderation/moderation-case.enums'
import { ReputationEventReason } from '../ranking/ranking-event.enums'
import { ReputationService } from '../ranking/reputation.service'

/** docs/produto/parametros.md: 5 negatives in 30 days, from different people in different matches. */
export const NEGATIVE_THRESHOLD = 5
export const NEGATIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export type TeammateView = {
  participationId: string
  gamertag: string | null
  category: LobbyParticipation['category']
  /** What this account gave them, if anything; always null for an opponent. */
  myRating: PeerRatingKind | null
}

/**
 * Peer rating after a finished match — phase 4.2.
 *
 * Only teammates of the same side, never the other team: losing and voting
 * the other side down is the abuse this shuts out. A thumbs-up is +1 at once
 * (the only way above 70); a negative moves nothing by itself, and only 5 in
 * 30 days from different people in different matches open a moderation case
 * — punishing stays a human decision. Optional, and never shown to the person
 * rated (RF-036).
 */
@Injectable()
export class PeerRatingService {
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(
    private readonly em: EntityManager,
    private readonly reputationService: ReputationService,
  ) {}

  async rate(
    accountId: string,
    lobbyId: string,
    participationId: string,
    kind: PeerRatingKind,
    now: Date = new Date(),
  ): Promise<void> {
    try {
      await this.em.fork().transactional(async (em) => {
        const [mine, theirs] = await Promise.all([
          em.findOne(
            LobbyParticipation,
            { lobby: lobbyId, account: accountId },
            { populate: ['lobby'] },
          ),
          em.findOne(LobbyParticipation, { id: participationId, lobby: lobbyId }),
        ])
        if (!mine) {
          throw new NotFoundException('no_lobby')
        }
        if (!theirs || theirs.side !== mine.side || theirs.id === mine.id) {
          throw new NotFoundException('not_a_teammate')
        }
        if (mine.lobby.state !== LobbyState.FINISHED) {
          throw new ConflictException('rating_closed')
        }
        // The reputation writer's lock; it also serializes the threshold count below.
        const target = await em.findOneOrFail(
          Account,
          { id: theirs.account.id },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        )
        // Under the target's lock, so this read decides; the unique index stays as backstop.
        if (
          await em.count(PeerRating, { lobby: lobbyId, fromAccount: accountId, toAccount: target })
        ) {
          throw new ConflictException('rating_exists')
        }
        em.create(PeerRating, {
          lobby: lobbyId,
          fromAccount: accountId,
          toAccount: target,
          kind,
          createdAt: now,
        })
        await em.flush()

        if (kind === PeerRatingKind.THUMBS_UP) {
          await this.reputationService.applyIn(
            em,
            target,
            ReputationEventReason.PEER_THUMBS_UP,
            lobbyId,
          )
        } else {
          await this.openCaseAtThreshold(em, target, now)
        }
        await em.flush()
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('rating_exists')
      throw error
    }
  }

  /**
   * The other humans of the match, for the rating and report screens
   * (`lastMatch`): the own side to rate, everyone to report.
   */
  async players(
    em: EntityManager,
    lobby: Lobby,
    accountId: string,
  ): Promise<{ teammates: TeammateView[]; opponents: TeammateView[] }> {
    const rows = await em.find(LobbyParticipation, { lobby }, { populate: ['character'] })
    const mine = rows.find((p) => p.account.id === accountId)
    if (!mine) return { teammates: [], opponents: [] }
    const others = rows.filter((p) => p.id !== mine.id)
    const [tags, given] = await Promise.all([
      em.find(PlatformGamertag, { account: { $in: others.map((p) => p.account.id) } }),
      em.find(PeerRating, { lobby, fromAccount: accountId }),
    ])
    const view = (p: LobbyParticipation): TeammateView => {
      // Shown inside the match's own history, as the profile rules allow.
      const tag = tags.find(
        (t) => t.account.id === p.account.id && t.platform === p.character.platform,
      )
      return {
        participationId: p.id,
        gamertag: tag ? decryptAtRest(this.encryptionKey, tag.gamertagEncrypted).toString() : null,
        category: p.category,
        myRating: given.find((r) => r.toAccount.id === p.account.id)?.kind ?? null,
      }
    }
    return {
      teammates: others.filter((p) => p.side === mine.side).map(view),
      opponents: others.filter((p) => p.side !== mine.side).map(view),
    }
  }

  /**
   * "Different people in different matches": both counts must reach 5. Only
   * negatives after the last case of this kind count, so one burst never
   * opens two.
   *
   * ponytail: two distinct counts, not a matching — 5 people over 5 matches
   * where one person gave all of them in one of the matches can pass. Exact
   * would be a bipartite matching; the moderator reading the case sees it.
   */
  private async openCaseAtThreshold(em: EntityManager, target: Account, now: Date): Promise<void> {
    const last = await em.findOne(
      ModerationCase,
      { type: ModerationCaseType.NEGATIVE_RATING_THRESHOLD, targetAccount: target },
      { orderBy: { openedAt: 'desc' } },
    )
    const windowStart = now.getTime() - NEGATIVE_WINDOW_MS
    const since = new Date(Math.max(windowStart, last?.openedAt.getTime() ?? 0))
    const negatives = await em.find(PeerRating, {
      toAccount: target,
      kind: PeerRatingKind.NEGATIVE,
      fromAccount: { $ne: null },
      createdAt: { $gt: since, $lte: now },
    })
    const people = new Set(negatives.map((r) => r.fromAccount!.id)).size
    const matches = new Set(negatives.map((r) => r.lobby.id)).size
    if (Math.min(people, matches) < NEGATIVE_THRESHOLD) return
    em.create(ModerationCase, {
      type: ModerationCaseType.NEGATIVE_RATING_THRESHOLD,
      origin: ModerationCaseOrigin.SYSTEM,
      state: ModerationCaseState.OPEN,
      targetAccount: target,
      openedAt: now,
    })
  }
}
