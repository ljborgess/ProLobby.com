import { Entity, Index, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'

/**
 * Dossier counterpart: `OcorrenciaRecusaFila` in docs/requisitos/03-dados.md
 * — #232. One row per explicit refusal or per 30 s run out; the two weigh the
 * same (RF-009). The block is derived from these rows (queue-block.ts), and
 * no reputation event is written for them (RF-011).
 */
@Entity({ tableName: 'queue_refusal' })
@Index({ properties: ['account', 'createdAt'] })
export class QueueRefusal {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Account, { deleteRule: 'cascade' })
  account!: Account

  /** The lobby refused. A plain id: the lobby itself is undone (#232). */
  @Property({ type: 'uuid' })
  lobbyId!: string

  @Property()
  createdAt: Date & Opt = new Date()
}
