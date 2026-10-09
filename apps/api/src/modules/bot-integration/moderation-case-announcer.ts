import { ChangeSetType, type EventSubscriber, type FlushEventArgs } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

import { ModerationCase } from '../moderation/moderation-case.entity'
import { ModerationCaseType } from '../moderation/moderation-case.enums'
import { EventDeliveryTargetKind } from './event-delivery.enums'
import { EventDeliveryService } from './event-delivery.service'

/**
 * #226: every moderation case opened is announced to the private moderators'
 * channel as `moderation.case_opened`, so the 24 h goal
 * (docs/produto/04-governanca/01-moderacao.md) does not depend on someone
 * opening the panel.
 *
 * One subscriber instead of a call in each service that opens a case: the
 * four that exist today (print verification, account recovery, punishment
 * appeal, delivery failure) and any added later are covered the same way.
 *
 * A delivery failure is never announced: it opens when the bot did not
 * confirm, and announcing it through the same bot would loop.
 *
 * ponytail: announced after the flush, not after the commit — a transaction
 * that rolls back after flushing a case would still send the alert. The alert
 * carries only the id, and the panel shows nothing for a case that does not
 * exist; an outbox row in the same transaction is the upgrade if that matters.
 */
@Injectable()
export class ModerationCaseAnnouncer implements EventSubscriber, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ModerationCaseAnnouncer.name)
  /** Announcements in flight, drained before the database goes away. */
  private readonly pending = new Set<Promise<void>>()
  private closing = false

  constructor(
    private readonly em: EntityManager,
    private readonly events: EventDeliveryService,
  ) {}

  onModuleInit(): void {
    this.em.getEventManager().registerSubscriber(this)
  }

  /**
   * Runs before the ORM closes its pool: an announcement still queuing would
   * otherwise hit a closed connection and log after the process meant to stop.
   */
  async onModuleDestroy(): Promise<void> {
    this.closing = true
    await Promise.allSettled(this.pending)
  }

  afterFlush(args: FlushEventArgs): void {
    for (const changeSet of args.uow.getChangeSets()) {
      const opened = changeSet.entity
      if (
        changeSet.type !== ChangeSetType.CREATE ||
        !(opened instanceof ModerationCase) ||
        opened.type === ModerationCaseType.BOT_DELIVERY_FAILURE
      ) {
        continue
      }
      if (this.closing) continue
      // Out of the flush that is still unwinding: enqueue flushes on its own.
      const done: Promise<void> = new Promise<void>((resolve) => setImmediate(resolve))
        .then(() => this.announce(opened.id, opened.type))
        .finally(() => this.pending.delete(done))
      this.pending.add(done)
    }
  }

  private async announce(caseId: string, caseType: ModerationCaseType): Promise<void> {
    try {
      await this.events.enqueue(
        {
          id: randomUUID(),
          occurredAt: new Date().toISOString(),
          type: 'moderation.case_opened',
          payload: { caseId, caseType },
        },
        { kind: EventDeliveryTargetKind.SYSTEM },
      )
    } catch (error) {
      // An alert that cannot be queued must not break whoever opened the case.
      this.logger.error(
        `could not announce moderation case ${caseId}`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
