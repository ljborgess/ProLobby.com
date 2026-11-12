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
import type { AccountPunishedEvent, PlatformEvent } from '@prolobby/types'
import { randomUUID } from 'node:crypto'

import { decryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import { hashIdentity, readIdentityHmacSecret } from '../../common/security/identity-hmac'
import { Account } from '../account/account.entity'
import { AccountPlan, AccountState } from '../account/account.enums'
import { Character, CharacterState } from '../character/character.entity'
import { EventDeliveryTargetKind } from './event-delivery.enums'
import { EventDeliveryService } from './event-delivery.service'

/**
 * The Discord roles follow the account (#313, #324): a suspension, its end and
 * a ban (RF-055); a plan set, revoked or lapsed;
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

  async onFlush({ em, uow }: FlushEventArgs): Promise<void> {
    for (const changeSet of uow.getChangeSets()) {
      if (changeSet.type !== ChangeSetType.UPDATE || !(changeSet.entity instanceof Account)) {
        continue
      }
      for (const event of await this.eventsFor(changeSet as ChangeSet<Account>)) {
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

  /**
   * What the bot must hear about this change, if anything (#313, #324): a
   * suspension, its end and a ban move the roles RF-055 names; a plan set or
   * a Discord linked with a plan moves Fundador/Apoiador. A ban already takes
   * the plan roles, so the plan it zeroes in the same change sends nothing.
   */
  private async eventsFor(changeSet: ChangeSet<Account>): Promise<PlatformEvent[]> {
    const account = changeSet.entity
    const discordId = this.discordIdOf(account)
    if (!discordId) return []
    const event = (rest: Pick<PlatformEvent, 'type' | 'payload'>) =>
      ({ id: randomUUID(), occurredAt: new Date().toISOString(), ...rest }) as PlatformEvent

    const kind =
      'state' in changeSet.payload
        ? kindOf(changeSet.originalEntity?.state as AccountState | undefined, account.state)
        : null
    if (kind === 'ban') return [event({ type: 'account.punished', payload: { discordId, kind } })]
    const events: PlatformEvent[] = []
    // Verificado comes back only to someone who had it: a verified character.
    if (kind === 'suspension' || (kind === 'suspension_ended' && (await this.verified(account)))) {
      events.push(event({ type: 'account.punished', payload: { discordId, kind } }))
    }
    const linked =
      'discordIdEncrypted' in changeSet.payload && !changeSet.originalEntity?.discordIdEncrypted
    if ('plan' in changeSet.payload || (linked && account.plan !== AccountPlan.NONE)) {
      events.push(
        event({ type: 'account.plan_changed', payload: { discordId, plan: account.plan } }),
      )
    }
    return events
  }

  /** Read outside the flushing transaction: characters are not what it changes. */
  private async verified(account: Account): Promise<boolean> {
    return (
      (await this.em
        .fork()
        .count(Character, { account: account.id, state: CharacterState.VERIFIED })) > 0
    )
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

function kindOf(
  before: AccountState | undefined,
  after: AccountState,
): AccountPunishedEvent['payload']['kind'] | null {
  if (before === after) return null
  if (after === AccountState.BANNED) return 'ban'
  if (after === AccountState.SUSPENDED) return 'suspension'
  if (before === AccountState.SUSPENDED && after !== AccountState.DELETED) return 'suspension_ended'
  return null
}
