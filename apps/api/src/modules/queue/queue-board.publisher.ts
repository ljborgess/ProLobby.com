import { Injectable, Logger } from '@nestjs/common'
import type { QueueBoardEvent } from '@prolobby/types'
import { randomUUID } from 'node:crypto'

import { CoordinationState } from '../bot-integration/coordination-state'
import { WebhookClient } from '../bot-integration/webhook-client'
import { QueueService } from './queue.service'

/**
 * At most one board every 30 s: a category going back and forth across a band
 * edge would otherwise redraw and upload the picture every 5 s run, on the
 * same bot that carries kicks and lobby channels.
 */
export const BOARD_MIN_INTERVAL_MS = 30_000

/**
 * Keeps #fila-status current: the band of each category (RF-008, never the
 * count) and the pause (#271), sent to the bot only when they change.
 *
 * Straight through the webhook, not `EventDelivery`: the board is a snapshot
 * that the next one replaces, so there is nothing to retry and no failure
 * worth a moderation case. A post that did not land leaves `last` alone, and
 * a later run sends it again. A refusal is logged once, when it starts, and
 * once more when it ends — not every 5 s.
 *
 * ponytail: `last` lives in memory (one API process, ADR-009); a restart
 * sends the board once more, which only refreshes the same message.
 */
@Injectable()
export class QueueBoardPublisher {
  private readonly logger = new Logger(QueueBoardPublisher.name)
  private last: string | null = null
  private sentAt = 0
  private failing = false
  private inFlight = false

  constructor(
    private readonly queueService: QueueService,
    private readonly coordination: CoordinationState,
    private readonly webhook: WebhookClient,
  ) {}

  /** Never throws, and never runs twice at once: the queue job does not wait on it. */
  async publish(now: Date = new Date()): Promise<boolean> {
    if (this.inFlight || now.getTime() - this.sentAt < BOARD_MIN_INTERVAL_MS) return false
    this.inFlight = true
    try {
      const payload: QueueBoardEvent['payload'] = {
        bands: (await this.queueService.movement()) as QueueBoardEvent['payload']['bands'],
        paused: this.coordination.pause(now.getTime()),
      }
      const key = JSON.stringify(payload)
      if (key === this.last) return false
      const { status } = await this.webhook.post({
        id: randomUUID(),
        occurredAt: now.toISOString(),
        type: 'queue.board',
        payload,
      })
      if (status < 200 || status >= 300) {
        this.fail(`the bot answered ${status}`)
        return false
      }
      if (this.failing) this.logger.log('queue board reaching the bot again')
      this.failing = false
      this.last = key
      this.sentAt = now.getTime()
      return true
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error))
      return false
    } finally {
      this.inFlight = false
    }
  }

  private fail(reason: string): void {
    if (!this.failing) this.logger.warn(`queue board not delivered: ${reason}`)
    this.failing = true
  }
}
