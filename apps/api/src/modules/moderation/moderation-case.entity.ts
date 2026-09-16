import { Entity, Enum, Index, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseState,
  ModerationCaseType,
} from './moderation-case.enums'

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

  @Property()
  openedAt: Date & Opt = new Date()
}
