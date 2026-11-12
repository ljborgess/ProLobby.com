import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { randomUUID } from 'node:crypto'

import { decryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import { Account } from '../account/account.entity'
import { AccountPlan, AccountState } from '../account/account.enums'
import { EventDeliveryTargetKind } from '../bot-integration/event-delivery.enums'
import { EventDeliveryService } from '../bot-integration/event-delivery.service'
import { AuditAction, recordAudit } from './audit-entry.entity'

/** docs/negocio/03-sustentabilidade.md: Supporter is R$ 9,90 a month. */
export const SUPPORTER_MONTH_MS = 30 * 24 * 60 * 60 * 1000

const CLOSED = [AccountState.BANNED, AccountState.DELETED]

type Change = {
  accountId: string
  discordId: string | null
  plan: AccountPlan
  planExpiresAt: Date | null
  roleChanged: boolean
}

/**
 * Founder and Supporter (#313), confirmed by hand from the PIX — there is no
 * billing. Founder is a one-off payment and never lapses; Supporter lasts a
 * month from the last confirmed payment, and setting it again renews it.
 *
 * Each change is audited in the same unit of work, and the bot is told after
 * the commit to give or take the Discord role (docs/discord/03-bot.md).
 */
@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name)
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(
    private readonly em: EntityManager,
    private readonly events: EventDeliveryService,
  ) {}

  async set(
    adminId: string,
    accountId: string,
    plan: AccountPlan,
    pixReference: string | undefined,
    now: Date = new Date(),
  ): Promise<{ plan: AccountPlan; planExpiresAt: Date | null }> {
    const change = await this.em.fork().transactional(async (em) => {
      const account = await em.findOne(
        Account,
        { id: accountId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      if (!account) throw new NotFoundException('player_not_found')
      // A ban takes the recognition roles away (docs/discord/03-bot.md): none comes back.
      if (plan !== AccountPlan.NONE && CLOSED.includes(account.state)) {
        throw new ConflictException('account_closed')
      }
      return this.apply(em, account, plan, now, {
        actorId: adminId,
        actorLabel: 'admin',
        pixReference: plan === AccountPlan.NONE ? null : (pixReference ?? null),
      })
    })
    await this.announce(change, now)
    return { plan: change.plan, planExpiresAt: change.planExpiresAt }
  }

  /** A Supporter month not renewed ends; the role goes with it. */
  @Cron(CronExpression.EVERY_HOUR, { timeZone: 'UTC' })
  async expire(now: Date = new Date()): Promise<number> {
    const changes = await this.em.fork().transactional(async (em) => {
      const lapsed = await em.find(
        Account,
        { plan: AccountPlan.SUPPORTER, planExpiresAt: { $lte: now } },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      return lapsed.map((account) =>
        this.apply(em, account, AccountPlan.NONE, now, {
          actorLabel: 'system',
          pixReference: null,
        }),
      )
    })
    for (const change of changes) await this.announce(change, now)
    if (changes.length) this.logger.log(`supporter plans lapsed: ${changes.length}`)
    return changes.length
  }

  private apply(
    em: EntityManager,
    account: Account,
    plan: AccountPlan,
    now: Date,
    by: { actorId?: string; actorLabel: string; pixReference: string | null },
  ): Change {
    const before = { plan: account.plan, expiresAt: account.planExpiresAt?.toISOString() ?? null }
    const roleChanged = account.plan !== plan
    account.plan = plan
    account.planExpiresAt =
      plan === AccountPlan.SUPPORTER ? new Date(now.getTime() + SUPPORTER_MONTH_MS) : undefined
    recordAudit(em, {
      action: AuditAction.PLAN_CHANGED,
      actorId: by.actorId,
      actorLabel: by.actorLabel,
      targetAccountId: account.id,
      before,
      after: {
        plan,
        expiresAt: account.planExpiresAt?.toISOString() ?? null,
        pixReference: by.pixReference,
      },
    })
    return {
      accountId: account.id,
      discordId: account.discordIdEncrypted
        ? decryptAtRest(this.encryptionKey, account.discordIdEncrypted).toString()
        : null,
      plan,
      planExpiresAt: account.planExpiresAt ?? null,
      roleChanged,
    }
  }

  /** A renewal keeps the same role: nothing for the bot. No Discord linked: nobody to give it to. */
  private async announce(change: Change, now: Date): Promise<void> {
    if (!change.roleChanged || !change.discordId) return
    await this.events.enqueue(
      {
        id: randomUUID(),
        occurredAt: now.toISOString(),
        type: 'account.plan_changed',
        payload: { discordId: change.discordId, plan: change.plan },
      },
      { kind: EventDeliveryTargetKind.ACCOUNT, id: change.accountId },
    )
  }
}
