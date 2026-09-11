import { Entity, Enum, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core'
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
  id: string = randomUUID()

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
  emailVerified: boolean = false

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
   * Null until phase 2.3 (OAuth2 linking). Unique and exclusive: one Discord
   * account never links to two platform accounts, otherwise banning by
   * Discord ID + gamertag becomes decoration and smurfing gets trivial
   * (docs/produto/03-partida/03-lobby.md).
   */
  @Property({ length: 32, nullable: true })
  @Unique()
  discordId?: string

  @Enum({ items: () => AccountRole, default: AccountRole.USER })
  role: AccountRole = AccountRole.USER

  /**
   * 0–100, starts at 70 — neutral-high, giving a new account the benefit of
   * the doubt instead of starting at zero as if it were already suspect
   * (docs/produto/02-jogador/02-ranking.md).
   */
  @Property({ type: 'smallint', default: 70 })
  reputation: number = 70

  @Enum({ items: () => AccountPlan, default: AccountPlan.NONE })
  plan: AccountPlan = AccountPlan.NONE

  @Enum({ items: () => AccountState, default: AccountState.UNVERIFIED })
  @Index()
  state: AccountState = AccountState.UNVERIFIED

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

  @Property()
  createdAt: Date = new Date()
}
