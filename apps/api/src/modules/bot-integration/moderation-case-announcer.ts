import { ChangeSetType, type EventSubscriber, type FlushEventArgs } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
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
export class ModerationCaseAnnouncer implements EventSubscriber, OnModuleInit {
  private readonly logger = new Logger(ModerationCaseAnnouncer.name)

  constructor(
    private readonly em: EntityManager,
    private readonly events: EventDeliveryService,
  ) {}

  onModuleInit(): void {
    this.em.getEventManager().registerSubscriber(this)
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
      // Out of the flush that is still unwinding: enqueue flushes on its own.
      setImmediate(() => void this.announce(opened.id, opened.type))
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
