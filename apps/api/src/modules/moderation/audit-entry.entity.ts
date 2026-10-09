import { Entity, Enum, Index, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import type { EntityManager } from '@mikro-orm/postgresql'
import { randomUUID } from 'node:crypto'

export enum AuditAction {
  /** A platform role given or taken (set-role.cli.ts). */
  ROLE_CHANGED = 'role_changed',
  /** A moderation case closed, by a moderator or by the system. */
  CASE_RESOLVED = 'case_resolved',
}

/**
 * The audit trail of moderation (#243; `01-moderacao.md` asks for a log of
 * every moderator action, and `02-lgpd.md` names the panel the highest-risk
 * target).
 *
 * **Append-only, enforced by the database**: a trigger refuses UPDATE, DELETE
 * and TRUNCATE for every role (migration of 2026-10-09), so a compromised API
 * cannot rewrite what it did. That is also why there is **no foreign key**:
 * a cascade from a deleted account would be an UPDATE or DELETE here, and the
 * trigger would block the deletion itself. The ids are kept as plain values —
 * after an LGPD deletion they point at nobody, which is the point.
 */
@Entity({ tableName: 'audit_entry' })
@Index({ properties: ['targetAccountId', 'createdAt'] })
export class AuditEntry {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @Enum({ items: () => AuditAction })
  action!: AuditAction

  /** Who acted, when it was an account. */
  @Property({ type: 'uuid', nullable: true })
  actorId?: string

  /** How: `moderator`, `system`, or `cli:<operator email>`. */
  @Property({ length: 120 })
  actorLabel!: string

  @Property({ type: 'uuid', nullable: true })
  targetAccountId?: string

  @Property({ type: 'uuid', nullable: true })
  caseId?: string

  @Property({ type: 'jsonb', nullable: true })
  before?: Record<string, unknown>

  @Property({ type: 'jsonb', nullable: true })
  after?: Record<string, unknown>

  @Property()
  createdAt: Date & Opt = new Date()
}

/**
 * Records one entry in the caller's unit of work, so it commits or rolls back
 * with the action it describes — never one without the other.
 */
export function recordAudit(
  em: EntityManager,
  entry: Omit<AuditEntry, 'id' | 'createdAt'>,
): AuditEntry {
  return em.create(AuditEntry, entry)
}
