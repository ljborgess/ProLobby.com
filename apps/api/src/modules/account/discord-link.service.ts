import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'

import { isUniqueViolation } from '../../common/database/postgres-error'
import { encryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import { hashIdentity, readIdentityHmacSecret } from '../../common/security/identity-hmac'
import { BlockedIdentity } from '../moderation/blocked-identity.entity'
import { Account } from './account.entity'
import { generateToken, hashToken } from './account.token'
import { DiscordLinkState } from './discord-link-state.entity'
import { DiscordOAuth } from './discord-oauth'

/** 10 minutes — long enough to authorize on Discord, short enough to be worthless later. */
export const DISCORD_LINK_STATE_TTL_MS = 10 * 60 * 1000

/**
 * Links a Discord account to a platform account — #149, RF-055 (any arrival
 * order, so no character is needed), RF-079 (a banned identity never links).
 *
 * The rules that shape the answers, from the design grilling on the issue:
 *
 * - **Already linked to another account** answers specifically. The person just
 *   authenticated as that Discord, so the identity is theirs and nothing leaks;
 *   a vague error would only strand them at support.
 * - **Blocked** answers generically and never says *which* identity tripped it.
 *   Confirming Discord vs gamertag would turn this screen into an oracle for
 *   testing identities one at a time (RF-079 in reverse).
 * - **Same Discord, same account** is a 200 that writes nothing: double clicks,
 *   back button and a second tab are normal paths, not mistakes.
 */
@Injectable()
export class DiscordLinkService {
  // Read at boot, like the evidence key: a missing secret must stop the process,
  // not fail the first person who tries to link. See `secrets-at-boot.e2e-spec`.
  private readonly hmacSecret = readIdentityHmacSecret()
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(
    private readonly em: EntityManager,
    private readonly discord: DiscordOAuth,
  ) {}

  /**
   * Whether this account has a Discord linked — the one thing the screen needs.
   * A boolean on purpose: the hash is deterministic and the ID is RNF-009 data,
   * so neither is ever part of an answer (item 17 of the security checklist).
   */
  async isLinked(accountId: string): Promise<boolean> {
    const account = await this.em.fork().findOneOrFail(Account, { id: accountId })

    return account.discordIdHash != null
  }

  /** Opens the flow: records a single-use state + PKCE pair and returns where to send the person. */
  async start(accountId: string): Promise<{ authorizationUrl: string }> {
    const em = this.em.fork()
    const account = await em.findOneOrFail(Account, { id: accountId })

    const state = generateToken()
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')

    // Built before the insert: with Discord unconfigured this throws 503, and no
    // orphan state row is left behind.
    const authorizationUrl = this.discord.authorizationUrl(state, codeChallenge)

    const link = new DiscordLinkState()
    link.account = account
    link.stateHash = hashToken(state)
    link.codeVerifier = codeVerifier
    link.expiresAt = new Date(Date.now() + DISCORD_LINK_STATE_TTL_MS)
    await em.persistAndFlush(link)

    return { authorizationUrl }
  }

  /** Closes the flow: redeems the state, asks Discord who this is, applies the gate, writes the link. */
  async complete(accountId: string, state: string, code: string): Promise<void> {
    const codeVerifier = await this.redeemState(accountId, state)
    const discordId = await this.discord.userIdFor(code, codeVerifier)
    const discordIdHash = hashIdentity(this.hmacSecret, discordId)

    try {
      // The gate and the write share one transaction: the ban check cannot be a
      // step that ran a moment before, on a row that has since changed.
      await this.em.fork().transactional(async (em) => {
        const blocked = await em.count(BlockedIdentity, { discordIdHash })
        if (blocked > 0) {
          throw new ForbiddenException('discord_link_blocked')
        }

        // Locked for the rest of the transaction: two callbacks of one account,
        // with two different Discords, would otherwise both read "no link yet" and
        // the last write would win — a swap that RF-082 says only moderation may do.
        const account = await em.findOneOrFail(
          Account,
          { id: accountId },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        )

        if (account.discordIdHash === discordIdHash) {
          return
        }

        if (account.discordIdHash) {
          // Unlinking does not exist (RF-082): changing identity is a moderation
          // request, never a second click here.
          throw new ConflictException('account_already_linked')
        }

        account.discordIdHash = discordIdHash
        account.discordIdEncrypted = encryptAtRest(this.encryptionKey, Buffer.from(discordId))
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('discord_already_linked')
      }
      throw error
    }
  }

  /**
   * Burns the state and hands back its verifier.
   *
   * Every failure — unknown, expired, used, or started by another account —
   * answers the same `invalid_state`: telling them apart would let a caller probe
   * which states exist. The single-use guarantee is the `usedAt is null` in the
   * UPDATE itself, so two racing callbacks cannot both win.
   */
  private async redeemState(accountId: string, state: string): Promise<string> {
    const em = this.em.fork()
    const now = new Date()
    const link = await em.findOne(DiscordLinkState, {
      stateHash: hashToken(state),
      account: accountId,
      usedAt: null,
      expiresAt: { $gt: now },
    })

    if (!link) {
      throw new BadRequestException('invalid_state')
    }

    const burned = await em.nativeUpdate(
      DiscordLinkState,
      { id: link.id, usedAt: null },
      { usedAt: now },
    )

    if (burned === 0) {
      throw new BadRequestException('invalid_state')
    }

    return link.codeVerifier
  }
}
