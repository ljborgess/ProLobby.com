import { Entity, Enum, Index, ManyToOne, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'
import { PrintSubmission } from '../character/print-submission.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseState,
  ModerationCaseType,
} from './moderation-case.enums'

/** Name of the class-level @Unique below — shared so it can't drift from itself. */
export const OPEN_ACCOUNT_RECOVERY_UNIQUE_INDEX = 'moderation_case_open_account_recovery_unique'

/** Name of the class-level @Unique below — shared so it can't drift from itself. */
export const ONE_APPEAL_PER_PUNISHMENT_UNIQUE_INDEX =
  'moderation_case_one_appeal_per_punishment_unique'

/**
 * A case in the moderation queue.
 *
 * Dossier counterpart: `CasoModeracao` in
 * docs/requisitos/03-dados.md#casomoderacao.
 *
 * The table ships in phase 2.1 because account recovery (RF-025) has to open
 * a case; the panel that resolves it is phase 5.
 */
@Entity({ tableName: 'moderation_case' })
@Unique({
  name: OPEN_ACCOUNT_RECOVERY_UNIQUE_INDEX,
  // Partial index: at most one *open* account_recovery case per account.
  // AccountRecoveryService relies on this to decide a race between two
  // concurrent requests, not on a count() read beforehand — see the comment
  // there. A raw expression because MikroORM's normal unique index has no
  // notion of a WHERE clause; this string must stay byte-identical to
  // migration 20260916120000, which is what actually creates it — this
  // decorator only exists so the schema generator (used by e2e tests'
  // refreshDatabase()) knows about it too, and doesn't diff it away.
  expression: `create unique index "${OPEN_ACCOUNT_RECOVERY_UNIQUE_INDEX}" on "moderation_case" ("target_account_id") where ("type" = 'account_recovery' and "state" = 'open')`,
})
@Unique({
  name: ONE_APPEAL_PER_PUNISHMENT_UNIQUE_INDEX,
  // One appeal per punishment, ever (RF-037) — not scoped to OPEN: a
  // resolved or dismissed appeal still counts. Reopening with new evidence
  // is a moderator action at resolution time (phase 5), not a second row
  // filed here. Byte-identical to migration 20260917100000 — see the note
  // on the account-recovery index above for why this has to be a raw
  // expression and stay in sync by hand.
  expression: `create unique index "${ONE_APPEAL_PER_PUNISHMENT_UNIQUE_INDEX}" on "moderation_case" ("appeals_case_id") where ("type" = 'punishment_appeal')`,
})
export class ModerationCase {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @Enum({ items: () => ModerationCaseType })
  type!: ModerationCaseType

  @Enum({ items: () => ModerationCaseState, default: ModerationCaseState.OPEN })
  @Index()
  state: ModerationCaseState & Opt = ModerationCaseState.OPEN

  @Enum({ items: () => ModerationCaseOrigin })
  origin!: ModerationCaseOrigin

  /** Plain uuid until phase 3, when the lobby table exists. */
  @Property({ type: 'uuid', nullable: true })
  lobbyId?: string

  /** Account the case is about. Null for cases that are not about a person. */
  @ManyToOne(() => Account, { nullable: true, deleteRule: 'set null' })
  targetAccount?: Account

  /**
   * Who opened it — null when `origin` is SYSTEM.
   *
   * Three rules lean on this column: the reported person never sees the
   * reporter (RF-036), at most 3 open reports per account (RF-068), and no
   * second dispute from the same person on the same match (RF-012).
   */
  @ManyToOne(() => Account, { nullable: true, deleteRule: 'set null', index: true })
  openedBy?: Account

  @ManyToOne(() => Account, { nullable: true, deleteRule: 'set null' })
  resolvedBy?: Account

  @Property({ nullable: true })
  resolvedAt?: Date

  /** What was decided, in the moderator's words. Read by the person involved. */
  @Property({ type: 'text', nullable: true })
  decision?: string

  /**
   * Local filesystem path to an attached screenshot — RF-025.
   *
   * Provisional (ADR-009): real print storage is the Oracle Object Storage
   * bucket, wired up with the rest of the upload pipeline in phase 2.2. This
   * column exists so account recovery has somewhere to put the evidence a
   * moderator needs *now*, without waiting for that pipeline — swapping the
   * writer later is a one-function change, not a migration.
   */
  @Property({ type: 'text', nullable: true })
  evidencePath?: string

  /** Why the appellant thinks the punishment is wrong — RF-081, RF-037. */
  @Property({ type: 'text', nullable: true })
  appealMessage?: string

  /**
   * The case this one appeals — set only on `PUNISHMENT_APPEAL`. The unique
   * index above is what actually enforces RF-037 (one appeal per
   * punishment); this column is what a moderator follows to see what is
   * being contested.
   */
  @ManyToOne(() => ModerationCase, { nullable: true, deleteRule: 'set null' })
  appealsCase?: ModerationCase

  /** The print a `CHARACTER_VERIFICATION` case is about — one case per print. */
  @ManyToOne(() => PrintSubmission, { nullable: true, deleteRule: 'cascade', unique: true })
  printSubmission?: PrintSubmission

  @Property()
  openedAt: Date & Opt = new Date()
}
