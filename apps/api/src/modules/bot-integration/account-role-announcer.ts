import {
  ChangeSetType,
  type ChangeSet,
  type EntityManager as AnyEntityManager,
  type EventSubscriber,
  type FlushEventArgs,
  type TransactionEventArgs,
} from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import type { PlatformEvent } from '@prolobby/types'
import { randomUUID } from 'node:crypto'

import { decryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import { hashIdentity, readIdentityHmacSecret } from '../../common/security/identity-hmac'
import { Account } from '../account/account.entity'
import { AccountPlan, AccountState } from '../account/account.enums'
import { EventDeliveryTargetKind } from './event-delivery.enums'
import { EventDeliveryService } from './event-delivery.service'

/**
 * The Discord roles follow the account (#313): a plan set, revoked or lapsed,
 * and a Discord linked by someone who already has a plan.
 *
 * Outbox: the delivery row is written in the same unit of work as the change
 * (`onFlush`), so a change never commits without its event and an event never
 * survives a rollback. The first attempt goes once the transaction commits;
 * a row whose kick was lost goes at the next boot (`recoverPending`).
 *
 * The bot has no database, so each event carries the whole answer (the plan,
 * not "add" or "remove") and the bot drops one older than the last it applied
 * for that person: a retry arriving late cannot undo a newer change.
 */
@Injectable()
export class AccountRoleAnnouncer implements EventSubscriber, OnModuleInit {
  private readonly logger = new Logger(AccountRoleAnnouncer.name)
  private readonly encryptionKey = readEvidenceEncryptionKey()
  private readonly hmacSecret = readIdentityHmacSecret()
  private readonly staged = new WeakMap<AnyEntityManager, string[]>()

  constructor(
    private readonly em: EntityManager,
    private readonly events: EventDeliveryService,
  ) {}

  onModuleInit(): void {
    this.em.getEventManager().registerSubscriber(this)
  }

  onFlush({ em, uow }: FlushEventArgs): void {
    for (const changeSet of uow.getChangeSets()) {
      if (changeSet.type !== ChangeSetType.UPDATE || !(changeSet.entity instanceof Account)) {
        continue
      }
      for (const event of this.eventsFor(changeSet as ChangeSet<Account>)) {
        const row = this.events.stage(em, event, {
          kind: EventDeliveryTargetKind.ACCOUNT,
          id: changeSet.entity.id,
        })
        uow.computeChangeSet(row)
        this.staged.set(em, [...(this.staged.get(em) ?? []), row.id])
      }
    }
  }

  /** Outside a transaction the flush already committed; inside one, wait for it. */
  afterFlush({ em }: FlushEventArgs): void {
    if (!em.isInTransaction()) this.kick(em)
  }

  afterTransactionCommit({ em }: TransactionEventArgs): void {
    this.kick(em)
  }

  afterTransactionRollback({ em }: TransactionEventArgs): void {
    this.staged.delete(em)
  }

  /**
   * Someone with a plan came back to the server (`discord.member_joined`): the
   * role they lost by leaving is given again. Banned or deleted: nothing.
   */
  async resyncOnJoin(discordId: string): Promise<void> {
    const account = await this.em.fork().findOne(Account, {
      discordIdHash: hashIdentity(this.hmacSecret, discordId),
    })
    if (
      !account ||
      account.plan === AccountPlan.NONE ||
      account.state === AccountState.BANNED ||
      account.state === AccountState.DELETED
    ) {
      return
    }
    await this.events.enqueue(
      {
        id: randomUUID(),
        occurredAt: new Date().toISOString(),
        type: 'account.plan_changed',
        payload: { discordId, plan: account.plan },
      },
      { kind: EventDeliveryTargetKind.ACCOUNT, id: account.id },
    )
  }

  /** What the bot must hear about this change, if anything. */
  private eventsFor(changeSet: ChangeSet<Account>): PlatformEvent[] {
    const account = changeSet.entity
    const discordId = this.discordIdOf(account)
    if (!discordId) return []
    const linked =
      'discordIdEncrypted' in changeSet.payload && !changeSet.originalEntity?.discordIdEncrypted
    const planChanged = 'plan' in changeSet.payload
    if (planChanged || (linked && account.plan !== AccountPlan.NONE)) {
      return [
        {
          id: randomUUID(),
          occurredAt: new Date().toISOString(),
          type: 'account.plan_changed',
          payload: { discordId, plan: account.plan },
        },
      ]
    }
    return []
  }

  /** A Discord id that cannot be read must not undo the change it rides on. */
  private discordIdOf(account: Account): string | null {
    if (!account.discordIdEncrypted) return null
    try {
      return decryptAtRest(this.encryptionKey, account.discordIdEncrypted).toString()
    } catch (error) {
      this.logger.error(
        `discord id unreadable, role event skipped for ${account.id}`,
        error instanceof Error ? error.stack : undefined,
      )
      return null
    }
  }

  private kick(em: AnyEntityManager): void {
    const ids = this.staged.get(em)
    if (!ids) return
    this.staged.delete(em)
    for (const id of ids) this.events.kick(id)
  }
}
