import {
  ChangeSetType,
  type EntityManager as AnyEntityManager,
  type EventSubscriber,
  type FlushEventArgs,
  type TransactionEventArgs,
} from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import type { AccountPunishedEvent } from '@prolobby/types'
import { randomUUID } from 'node:crypto'

import { decryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import { Account } from '../account/account.entity'
import { AccountState } from '../account/account.enums'
import { EventDeliveryTargetKind } from './event-delivery.enums'
import { EventDeliveryService } from './event-delivery.service'

type Kind = AccountPunishedEvent['payload']['kind']
type Pending = { accountId: string; discordId: string; kind: Kind }

/**
 * #324, RF-055: tells the bot when an account is suspended, served its
 * suspension, or is banned, so the Discord roles follow (docs/discord/03-bot.md).
 *
 * One subscriber on the account's state instead of a call in each place that
 * changes it — the punishment ladder and the suspension job today, an appeal
 * granted later. Seen at the flush, sent only after the commit: a punishment
 * rolled back must never take a role away.
 *
 * ponytail: staged per EntityManager, and only the root commit fires. A state
 * change flushed by a nested `transactional` fork would not be announced; no
 * caller nests today (the punishment runs on the caller's own em). An outbox
 * row in the same transaction is the upgrade if one ever does.
 */
@Injectable()
export class PunishmentAnnouncer implements EventSubscriber, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PunishmentAnnouncer.name)
  private readonly encryptionKey = readEvidenceEncryptionKey()
  private readonly staged = new WeakMap<AnyEntityManager, Pending[]>()
  private readonly inFlight = new Set<Promise<void>>()
  private closing = false

  constructor(
    private readonly em: EntityManager,
    private readonly events: EventDeliveryService,
  ) {}

  onModuleInit(): void {
    this.em.getEventManager().registerSubscriber(this)
  }

  async onModuleDestroy(): Promise<void> {
    this.closing = true
    await Promise.allSettled(this.inFlight)
  }

  afterFlush({ em, uow }: FlushEventArgs): void {
    for (const changeSet of uow.getChangeSets()) {
      const account = changeSet.entity
      if (
        changeSet.type !== ChangeSetType.UPDATE ||
        !(account instanceof Account) ||
        !('state' in changeSet.payload) ||
        !account.discordIdEncrypted
      ) {
        continue
      }
      const kind = kindOf(
        changeSet.originalEntity?.state as AccountState | undefined,
        account.state,
      )
      if (!kind) continue
      const pending = this.staged.get(em) ?? []
      pending.push({
        accountId: account.id,
        discordId: decryptAtRest(this.encryptionKey, account.discordIdEncrypted).toString(),
        kind,
      })
      this.staged.set(em, pending)
    }
  }

  // Keyed by the EntityManager: `em.transactional` commits with no unit of work
  // in the event, only the fork that flushed.
  afterTransactionCommit({ em }: TransactionEventArgs): void {
    const pending = this.staged.get(em)
    if (!pending) return
    this.staged.delete(em)
    if (this.closing) return
    for (const item of pending) {
      const sent: Promise<void> = this.announce(item).finally(() => this.inFlight.delete(sent))
      this.inFlight.add(sent)
    }
  }

  afterTransactionRollback({ em }: TransactionEventArgs): void {
    this.staged.delete(em)
  }

  private async announce({ accountId, discordId, kind }: Pending): Promise<void> {
    try {
      await this.events.enqueue(
        {
          id: randomUUID(),
          occurredAt: new Date().toISOString(),
          type: 'account.punished',
          payload: { discordId, kind },
        },
        { kind: EventDeliveryTargetKind.ACCOUNT, id: accountId },
      )
    } catch (error) {
      this.logger.error(
        `punishment not announced (${kind})`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}

function kindOf(before: AccountState | undefined, after: AccountState): Kind | null {
  if (before === after) return null
  if (after === AccountState.BANNED) return 'ban'
  if (after === AccountState.SUSPENDED) return 'suspension'
  if (before === AccountState.SUSPENDED && after !== AccountState.DELETED) return 'suspension_ended'
  return null
}
