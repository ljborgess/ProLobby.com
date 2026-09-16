import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { isUniqueViolation } from '../../common/database/postgres-error'
import { WaitingListEntry } from './waiting-list-entry.entity'

@Injectable()
export class WaitingListService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Records intent to be notified when sign-up reopens — RF-078.
   *
   * Idempotent: asking twice while sign-up stays paused is the same person
   * expressing the same intent, not two rows to email later. The unique
   * index is what actually enforces that — a check-then-insert would let two
   * requests for the same address both pass the check and both try to
   * insert, the same race `AccountService.signUp` already has to handle for
   * the account table itself.
   *
   * Does not check whether sign-up is actually paused right now: the caller
   * (the sign-up screen) only shows this form when it has just been refused,
   * and re-deriving that here would be a second source of truth for the same
   * one already in CapacityService — this method trusts the caller the same
   * way a "forgot password" link trusts the person clicking it forgot theirs.
   */
  async join(email: string): Promise<void> {
    const em = this.em.fork()
    em.persist(em.create(WaitingListEntry, { email }))

    try {
      await em.flush()
    } catch (error) {
      if (isUniqueViolation(error)) {
        return
      }
      throw error
    }
  }
}
