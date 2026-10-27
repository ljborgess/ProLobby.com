import { Entity, Enum, Index, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { EventDeliveryTargetKind } from './event-delivery.enums'

/**
 * Retry and idempotency record for a platform → bot event (RF-058).
 *
 * Dossier counterpart: `EntregaEvento` in docs/requisitos/03-dados.md.
 *
 * Lives in the API, not the bot: the bot has no database and would lose the
 * queue on restart, which is exactly when retry matters. Unique `eventId`
 * discards a duplicate insert (RNF-018). `nextAttemptAt` is the schedule:
 * retries are armed at failure time, never by polling the table in a loop
 * (ADR-009 — a `setInterval` would keep Neon awake 24h).
 */
@Entity({ tableName: 'event_delivery' })
export class EventDelivery {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @Property({ type: 'uuid' })
  @Unique()
  eventId!: string

  @Property({ length: 64 })
  type!: string

  /**
   * The payload as JSON, AES-256-GCM like every personal datum at rest
   * (RNF-009): `lobby.closed` carries the Discord ids of the whole lobby.
   * Read through `EventDeliveryService.payloadOf`, never queried.
   */
  @Property({ type: 'blob', hidden: true })
  payloadEncrypted!: Buffer

  /**
   * When the event happened — the business timestamp, forwarded to the bot
   * unchanged on every attempt.
   *
   * Stored because the replay window lives on the *signing* timestamp, not on
   * this one: without a column here, a retry had nothing to send and the
   * sender ended up stamping now, quietly destroying the only record of
   * when the lobby actually closed.
   */
  @Property()
  occurredAt!: Date

  @Enum({ items: () => EventDeliveryTargetKind })
  targetKind!: EventDeliveryTargetKind

  /** Lobby id or account id. Null for `system` (quota alerts have no user). */
  @Property({ type: 'uuid', nullable: true })
  targetId?: string

  @Property({ type: 'smallint', default: 0 })
  attempts: number & Opt = 0

  @Property({ nullable: true })
  deliveredAt?: Date

  @Property({ nullable: true })
  @Index()
  nextAttemptAt?: Date

  @Property()
  createdAt: Date & Opt = new Date()
}
