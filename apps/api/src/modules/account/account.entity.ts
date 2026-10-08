import { Entity, Enum, Index, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { AccountPlan, AccountRole, AccountState } from './account.enums'

/**
 * A person's identity and reputation. One per Discord ID.
 *
 * Dossier counterpart: `Conta` in docs/requisitos/03-dados.md#conta — every
 * other entity points here, so this one is built first.
 */
@Entity({ tableName: 'account' })
export class Account {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @Property({ length: 320 })
  @Unique()
  email!: string

  /** argon2id hash. Never the password itself — see HashService. */
  @Property({ length: 255, hidden: true })
  passwordHash!: string

  /**
   * A verified email gates the queue (RF-002), not browsing: an unverified
   * account can still see profiles, rankings and match history.
   */
  @Property({ default: false })
  emailVerified: boolean & Opt = false

  /**
   * Birth date, not age: age is computed at sign-up and anything under 16 is
   * rejected on the spot (RF-021). Storing the age would make the row wrong
   * the day after a birthday.
   */
  @Property({ type: 'date' })
  birthDate!: Date

  /**
   * Security question and answer are *mandatory* at sign-up (RF-019). Without
   * them, losing both email and Discord leaves no recovery path at all — the
   * worst possible support scenario (RF-025).
   */
  @Property({ length: 200 })
  securityQuestion!: string

  /** argon2id hash, for the same reason as the password: it is a shared secret. */
  @Property({ length: 255, hidden: true })
  securityAnswerHash!: string

  /**
   * Null until the Discord account is linked (phase 2.3). Unique and exclusive:
   * one Discord account never links to two platform accounts, otherwise banning
   * by Discord ID + gamertag becomes decoration and smurfing gets trivial
   * (docs/produto/03-partida/03-lobby.md).
   *
   * Two columns rather than one plain `discordId`, per the data model decision
   * of 2026-09-11 (docs/requisitos/03-dados.md): RNF-009 forbids a Discord ID in
   * plain text, but it is also the key that carries uniqueness, the bot's lookup
   * and the ban-list comparison. The HMAC serves all three; the ciphertext
   * serves display and the bot calls that need the real ID back.
   *
   * The HMAC uses the same secret as `BlockedIdentity` and `PlatformGamertag` —
   * see `hashIdentity`, which explains why a per-table secret breaks RF-079.
   *
   * Hidden like the two password-shaped hashes above, and for a reason of its
   * own: the value is deterministic, so a hash in any response turns that
   * endpoint into an oracle — hash a Discord ID, compare, and learn whether it
   * is linked here. Item 17 of the security checklist.
   */
  @Property({ length: 64, nullable: true, hidden: true })
  @Unique()
  discordIdHash?: string

  /** AES-256-GCM, via `encryptAtRest`. Hidden: it is never part of a response. */
  @Property({ type: 'blob', nullable: true, hidden: true })
  discordIdEncrypted?: Buffer

  /**
   * Whether this account's Discord is currently inside the server (RF-060).
   *
   * Not part of `state`: `state` gates the whole API, and someone who stepped
   * out of the Discord server must still be able to sign in and read the notice
   * telling them how to get back. It only blocks the queue, and the queue reads
   * this. The link itself is never touched — leaving is not unlinking.
   *
   * Defaults to true so an account that links but never triggers an event is not
   * locked out by a fact nobody reported.
   */
  @Property({ default: true })
  discordPresent: boolean & Opt = true

  /**
   * The `occurredAt` of the event that set `discordPresent`. Events are applied
   * only if they are not older than this, so a delayed "left" arriving after a
   * "joined" cannot lock somebody out for good.
   */
  @Property({ nullable: true })
  discordPresenceAt?: Date

  @Enum({ items: () => AccountRole, default: AccountRole.USER })
  role: AccountRole & Opt = AccountRole.USER

  /**
   * 0–100, starts at 70 — neutral-high, giving a new account the benefit of
   * the doubt instead of starting at zero as if it were already suspect
   * (docs/produto/02-jogador/02-ranking.md).
   */
  @Property({ type: 'smallint', default: 70 })
  reputation: number & Opt = 70

  @Enum({ items: () => AccountPlan, default: AccountPlan.NONE })
  plan: AccountPlan & Opt = AccountPlan.NONE

  @Enum({ items: () => AccountState, default: AccountState.UNVERIFIED })
  @Index()
  state: AccountState & Opt = AccountState.UNVERIFIED

  /**
   * When the 7-day suspension expires. This is what lets a job restore
   * reputation to 45 once the penalty is served (RF-074) — without the
   * column, the end of a suspension would mean scanning the event log for the
   * last punishment.
   *
   * The rule that consumes it lands in phase 4.2; the column ships now so it
   * never becomes a retroactive migration.
   */
  @Property({ nullable: true })
  suspensionEndsAt?: Date

  /**
   * Sessions issued before this instant no longer count. The token itself is
   * stateless, so this is how a password reset ends every open session —
   * including one held by whoever made the reset necessary.
   */
  @Property({ nullable: true })
  sessionsValidFrom?: Date

  @Property()
  createdAt: Date & Opt = new Date()
}
