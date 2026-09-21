import { Entity, Index, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from './account.entity'

/**
 * A pending Discord link — the `state` and PKCE half of the OAuth2 flow (#149).
 *
 * The state lives on the server, not in a cookie: single use has to be recorded
 * where whoever controls the browser cannot un-record it. Same shape as
 * `EmailVerification` and `PasswordReset`, for the same reasons.
 *
 * `stateHash` is a SHA-256 of the opaque value sent to Discord, so a database
 * leak does not hand over states that could still be redeemed. `codeVerifier`
 * is stored in the clear on purpose: the flow needs it back to call the token
 * endpoint, it is worthless without the authorization code, and it dies with
 * the row (10 minutes).
 */
@Entity({ tableName: 'discord_link_state' })
export class DiscordLinkState {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  /** Tied to the session that started the flow: a callback from another account is refused. */
  @ManyToOne(() => Account, { deleteRule: 'cascade', index: true })
  account!: Account

  @Property({ length: 64 })
  @Index()
  stateHash!: string

  @Property({ length: 128, hidden: true })
  codeVerifier!: string

  /** 10 minutes — long enough to authorize on Discord, short enough to be worthless later. */
  @Property()
  expiresAt!: Date

  /** Set when redeemed. Kept, not deleted, so a replay reads as "already used". */
  @Property({ nullable: true })
  usedAt?: Date

  @Property()
  createdAt: Date & Opt = new Date()
}
