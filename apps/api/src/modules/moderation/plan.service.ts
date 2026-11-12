import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'

import { Account } from '../account/account.entity'
import { AccountPlan, AccountState } from '../account/account.enums'
import { PaymentEvent, PaymentEventType } from '../account/payment-event.entity'
import { AuditAction, recordAudit } from './audit-entry.entity'

/** docs/negocio/03-sustentabilidade.md: Supporter is R$ 9,90 a month. */
export const SUPPORTER_MONTH_MS = 30 * 24 * 60 * 60 * 1000

/** The prices in 03-sustentabilidade.md; the fiscal record keeps what was charged. */
const PRICE: Record<PaymentEventType, string> = {
  [PaymentEventType.FOUNDER]: '49.00',
  [PaymentEventType.SUPPORTER]: '9.90',
}

const CLOSED = [AccountState.BANNED, AccountState.DELETED]

export type PlanView = { plan: AccountPlan; planExpiresAt: Date | null }

/**
 * Changes a plan and audits it, in the caller's unit of work. The Discord role
 * follows on its own: AccountRoleAnnouncer sees the plan change at the flush.
 * Shared by the panel, the lapse job and the ban, so the audit reads the same.
 */
export function changePlan(
  em: EntityManager,
  account: Account,
  plan: AccountPlan,
  expiresAt: Date | undefined,
  by: { actorId?: string; actorLabel: string; caseId?: string; pixReference: string | null },
): void {
  recordAudit(em, {
    action: AuditAction.PLAN_CHANGED,
    actorId: by.actorId,
    actorLabel: by.actorLabel,
    targetAccountId: account.id,
    caseId: by.caseId,
    before: { plan: account.plan, expiresAt: account.planExpiresAt?.toISOString() ?? null },
    after: { plan, expiresAt: expiresAt?.toISOString() ?? null, pixReference: by.pixReference },
  })
  account.plan = plan
  account.planExpiresAt = expiresAt
}

/**
 * Founder and Supporter (#313), confirmed by hand from the PIX — there is no
 * billing. Founder is a one-off payment and never lapses; Supporter lasts a
 * month, and a payment made before the month ends adds to it.
 */
@Injectable()
export class PlanService {
  constructor(private readonly em: EntityManager) {}

  async set(
    adminId: string,
    accountId: string,
    plan: AccountPlan,
    pixReference: string | undefined,
    now: Date = new Date(),
  ): Promise<PlanView> {
    return this.em.fork().transactional(async (em) => {
      const account = await em.findOne(
        Account,
        { id: accountId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      if (!account) throw new NotFoundException('player_not_found')
      if (plan === AccountPlan.NONE) {
        if (account.plan !== AccountPlan.NONE) {
          changePlan(em, account, plan, undefined, {
            actorId: adminId,
            actorLabel: 'admin',
            pixReference: null,
          })
        }
        return viewOf(account)
      }
      // A ban takes the recognition roles away (docs/discord/03-bot.md): none comes back.
      if (CLOSED.includes(account.state)) throw new ConflictException('account_closed')
      // Founder already has Supporter's benefits, for good: a month would replace it.
      if (account.plan === AccountPlan.FOUNDER) throw new ConflictException('already_founder')

      const expiresAt =
        plan === AccountPlan.SUPPORTER
          ? new Date(
              Math.max(now.getTime(), account.planExpiresAt?.getTime() ?? 0) + SUPPORTER_MONTH_MS,
            )
          : undefined
      changePlan(em, account, plan, expiresAt, {
        actorId: adminId,
        actorLabel: 'admin',
        pixReference: pixReference ?? null,
      })
      const type =
        plan === AccountPlan.FOUNDER ? PaymentEventType.FOUNDER : PaymentEventType.SUPPORTER
      em.create(PaymentEvent, {
        account,
        type,
        amount: PRICE[type],
        confirmedBy: em.getReference(Account, adminId),
        confirmedAt: now,
      })
      return viewOf(account)
    })
  }

  /** A Supporter month not renewed ends; the role goes with it. */
  async expire(now: Date = new Date()): Promise<number> {
    return this.em.fork().transactional(async (em) => {
      const lapsed = await em.find(
        Account,
        { plan: AccountPlan.SUPPORTER, planExpiresAt: { $lte: now } },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      for (const account of lapsed) {
        changePlan(em, account, AccountPlan.NONE, undefined, {
          actorLabel: 'system',
          pixReference: null,
        })
      }
      return lapsed.length
    })
  }
}

const viewOf = (account: Account): PlanView => ({
  plan: account.plan,
  planExpiresAt: account.planExpiresAt ?? null,
})
