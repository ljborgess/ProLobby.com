import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { platformEventSchema, type PlatformEvent } from '@prolobby/types'

import { Clock } from '../../common/time/clock'
import { isUniqueViolation } from '../../common/database/postgres-error'
import {
  decryptAtRest,
  encryptAtRest,
  readEvidenceEncryptionKey,
} from '../../common/security/evidence-encryption'
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
  /** Attempts in flight, awaited on shutdown so none writes to a closed pool. */
  private readonly inFlight = new Set<Promise<void>>()
  private pendingLookups = 0
  /**
   * Set on shutdown. A late enqueue (the moderation announcer drains after
   * this service may already be gone) still writes its row, which the next
   * boot recovers, but starts no attempt against a closing pool.
   */
  private closed = false
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly webhook: WebhookClient,
  ) {}

  async onModuleDestroy(): Promise<void> {
    this.closed = true
    for (const cancel of this.cancelById.values()) {
      cancel()
    }
    this.cancelById.clear()
    await Promise.allSettled(this.inFlight)
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
      payloadEncrypted: encryptAtRest(
        this.encryptionKey,
        Buffer.from(JSON.stringify(parsed.payload)),
      ),
      occurredAt: new Date(parsed.occurredAt),
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
    if (this.closed) return
    this.cancelById.get(id)?.()
    const cancel = this.clock.schedule(delayMs, () => {
      this.cancelById.delete(id)
      void this.attempt(id)
    })
    this.cancelById.set(id, cancel)
  }

  /**
   * One attempt, and it never throws.
   *
   * Callers fire this with `void` — from `enqueue` and from a timer — so an
   * escaping rejection would be an unhandled one, and Node ends the process
   * for those. A database blip while recording a retry must not take down an
   * API that is answering requests: the row keeps its `nextAttemptAt` and the
   * next boot picks it up.
   */
  private attempt(id: string): Promise<void> {
    if (this.closed) return Promise.resolve()
    const run: Promise<void> = this.deliver(id)
      .catch((error: unknown) => {
        this.logger.error(
          `delivery attempt failed for ${id}`,
          error instanceof Error ? error.stack : undefined,
        )
      })
      .finally(() => this.inFlight.delete(run))
    this.inFlight.add(run)
    return run
  }

  private async deliver(id: string): Promise<void> {
    const em = this.em.fork()
    const row = await em.findOne(EventDelivery, { id })
    if (!row || row.deliveredAt || row.attempts >= DELIVERY_MAX_ATTEMPTS) {
      return
    }

    row.attempts += 1
    const event = this.toEvent(row)

    // Only the HTTP call is guarded here. Wrapping the database work in the
    // same `try` made a failed write run the retry path twice — once from the
    // body, once from the catch.
    let status: number | null = null
    try {
      status = (await this.webhook.post(event)).status
    } catch {
      // Timeout, connection refused, DNS — the bot may simply be restarting.
      status = null
    }

    if (status === 202) {
      row.deliveredAt = this.clock.now()
      row.nextAttemptAt = undefined
      await em.flush()
      this.cancelById.get(id)?.()
      this.cancelById.delete(id)
      return
    }

    // A rejected *contract* never becomes valid by waiting: the bot said this
    // payload is not something it accepts, and the next three attempts would
    // send the same bytes for the same answer. Burning them would also hide
    // the real cause behind a case that reads "the bot never confirmed", when
    // the truth is that we sent something it refuses.
    //
    // 429 is the exception — that one *is* "try later" (issue #94).
    if (status !== null && isPermanentRejection(status)) {
      await this.giveUp(em, row, `bot refused the event with HTTP ${status}`)
      return
    }

    await this.scheduleRetry(em, row)
  }

  private async scheduleRetry(em: EntityManager, row: EventDelivery): Promise<void> {
    const delay = DELIVERY_BACKOFF_MS[row.attempts - 1]

    if (delay === undefined) {
      await this.giveUp(em, row, 'retries exhausted, the bot never confirmed')
      return
    }

    row.nextAttemptAt = new Date(this.clock.now().getTime() + delay)
    await em.flush()
    this.arm(row.id, delay)
  }

  /** Stops trying and hands the event to a human — RF-058. */
  private async giveUp(em: EntityManager, row: EventDelivery, reason: string): Promise<void> {
    row.nextAttemptAt = undefined
    // Counted as spent even when we stop early, so a boot recovery does not
    // pick the row back up and start the same losing loop again.
    row.attempts = DELIVERY_MAX_ATTEMPTS
    this.cancelById.get(row.id)?.()
    this.cancelById.delete(row.id)
    await this.openDeliveryFailureCase(em, row, reason)
    await em.flush()
  }

  private async openDeliveryFailureCase(
    em: EntityManager,
    row: EventDelivery,
    reason: string,
  ): Promise<void> {
    em.persist(
      em.create(ModerationCase, {
        type: ModerationCaseType.BOT_DELIVERY_FAILURE,
        origin: ModerationCaseOrigin.SYSTEM,
        // Traceable without digging through logs — a moderator opening this
        // case sees which lobby the bot never confirmed, when there is one.
        lobbyId: row.targetKind === EventDeliveryTargetKind.LOBBY ? row.targetId : undefined,
        // Audit of 2026-09-21: an account-targeted event (`account.punished`)
        // opened a case naming nobody, and the moderator could not tell whose
        // role or ban never reached Discord. A primary key is enough here —
        // MikroORM turns it into the reference.
        targetAccount:
          row.targetKind === EventDeliveryTargetKind.ACCOUNT ? row.targetId : undefined,
      }),
    )
    this.logger.error(`delivery gave up on event ${row.eventId} (${row.type}): ${reason}`)
  }

  private toEvent(row: EventDelivery): PlatformEvent {
    return platformEventSchema.parse({
      id: row.eventId,
      type: row.type,
      // The stored instant, never "now": the bot is told when the event
      // happened, not when this attempt left. Freshness is the signing
      // timestamp's job, and WebhookClient stamps that per attempt.
      occurredAt: row.occurredAt.toISOString(),
      payload: this.payloadOf(row),
    })
  }

  /** The stored payload, decrypted. */
  payloadOf(row: EventDelivery): Record<string, unknown> {
    return JSON.parse(
      decryptAtRest(this.encryptionKey, row.payloadEncrypted).toString('utf8'),
    ) as Record<string, unknown>
  }
}

/**
 * 4xx other than 429: the bot understood the request and refused it. Sending
 * the identical bytes again cannot change that answer.
 */
function isPermanentRejection(status: number): boolean {
  return status >= 400 && status < 500 && status !== 429
}
