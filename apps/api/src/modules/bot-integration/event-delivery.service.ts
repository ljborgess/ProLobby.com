import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { platformEventSchema, type PlatformEvent } from '@prolobby/types'

import { Clock } from '../../common/time/clock'
import { isUniqueViolation } from '../../common/database/postgres-error'
import { ModerationCase } from '../moderation/moderation-case.entity'
import { ModerationCaseOrigin, ModerationCaseType } from '../moderation/moderation-case.enums'
import { EventDelivery } from './event-delivery.entity'
import { EventDeliveryTargetKind } from './event-delivery.enums'
import { WebhookClient } from './webhook-client'

/** RF-058: one immediate POST, then three retries at 10s / 20s / 40s. */
export const DELIVERY_BACKOFF_MS = [10_000, 20_000, 40_000] as const
export const DELIVERY_MAX_ATTEMPTS = 1 + DELIVERY_BACKOFF_MS.length

export type DeliveryTarget = {
  kind: EventDeliveryTargetKind
  id?: string
}

@Injectable()
export class EventDeliveryService implements OnModuleDestroy {
  private readonly logger = new Logger(EventDeliveryService.name)
  private readonly cancelById = new Map<string, () => void>()
  private pendingLookups = 0

  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly webhook: WebhookClient,
  ) {}

  onModuleDestroy(): void {
    for (const cancel of this.cancelById.values()) {
      cancel()
    }
    this.cancelById.clear()
  }

  /** Exposed for the "no cyclic query" proof — not a scheduler tick. */
  getPendingLookupCount(): number {
    return this.pendingLookups
  }

  /**
   * Boot: one query for leftovers of a restart, then arm each timer.
   * Called from `main.ts`, not OnModuleInit — tests build the module without
   * the table existing yet. Not a loop: if nothing is pending, nothing else
   * touches the table until a new event is enqueued (ADR-009).
   */
  async recoverPending(): Promise<void> {
    this.pendingLookups += 1
    const em = this.em.fork()
    const pending = await em.find(EventDelivery, {
      deliveredAt: null,
      attempts: { $lt: DELIVERY_MAX_ATTEMPTS },
    })

    const now = this.clock.now().getTime()
    for (const row of pending) {
      const delay = row.nextAttemptAt ? Math.max(0, row.nextAttemptAt.getTime() - now) : 0
      this.arm(row.id, delay)
    }
  }

  /**
   * Persists the delivery (idempotent on event id) and fires the first
   * attempt without the caller awaiting the HTTP round-trip.
   */
  async enqueue(event: PlatformEvent, target: DeliveryTarget): Promise<EventDelivery> {
    const parsed = platformEventSchema.parse(event)
    const em = this.em.fork()
    const row = em.create(EventDelivery, {
      eventId: parsed.id,
      type: parsed.type,
      payload: { ...parsed.payload },
      targetKind: target.kind,
      targetId: target.id,
    })
    em.persist(row)

    try {
      await em.flush()
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existing = await em.findOneOrFail(EventDelivery, { eventId: parsed.id })
        return existing
      }
      throw error
    }

    void this.attempt(row.id)
    return row
  }

  private arm(id: string, delayMs: number): void {
    this.cancelById.get(id)?.()
    const cancel = this.clock.schedule(delayMs, () => {
      this.cancelById.delete(id)
      void this.attempt(id)
    })
    this.cancelById.set(id, cancel)
  }

  private async attempt(id: string): Promise<void> {
    const em = this.em.fork()
    const row = await em.findOne(EventDelivery, { id })
    if (!row || row.deliveredAt || row.attempts >= DELIVERY_MAX_ATTEMPTS) {
      return
    }

    row.attempts += 1
    const event = this.toEvent(row)

    try {
      const { status } = await this.webhook.post(event)
      // 429 is a retryable "try later" (issue #94), not a definitive failure.
      if (status === 202) {
        row.deliveredAt = this.clock.now()
        row.nextAttemptAt = undefined
        await em.flush()
        this.cancelById.get(id)?.()
        this.cancelById.delete(id)
        return
      }

      await this.scheduleRetry(em, row)
    } catch {
      await this.scheduleRetry(em, row)
    }
  }

  private async scheduleRetry(em: EntityManager, row: EventDelivery): Promise<void> {
    if (row.attempts >= DELIVERY_MAX_ATTEMPTS) {
      row.nextAttemptAt = undefined
      await this.openDeliveryFailureCase(em, row)
      await em.flush()
      return
    }

    const delay = DELIVERY_BACKOFF_MS[row.attempts - 1]
    if (delay === undefined) {
      await this.openDeliveryFailureCase(em, row)
      await em.flush()
      return
    }
    row.nextAttemptAt = new Date(this.clock.now().getTime() + delay)
    await em.flush()
    this.arm(row.id, delay)
  }

  private async openDeliveryFailureCase(em: EntityManager, row: EventDelivery): Promise<void> {
    em.persist(
      em.create(ModerationCase, {
        type: ModerationCaseType.BOT_DELIVERY_FAILURE,
        origin: ModerationCaseOrigin.SYSTEM,
        // Traceable without digging through logs — a moderator opening this
        // case sees which lobby the bot never confirmed, when there is one.
        lobbyId: row.targetKind === EventDeliveryTargetKind.LOBBY ? row.targetId : undefined,
      }),
    )
    this.logger.error(`delivery exhausted for event ${row.eventId} (${row.type})`)
  }

  private toEvent(row: EventDelivery): PlatformEvent {
    return platformEventSchema.parse({
      id: row.eventId,
      type: row.type,
      occurredAt: this.clock.now().toISOString(),
      payload: row.payload,
    })
  }
}
