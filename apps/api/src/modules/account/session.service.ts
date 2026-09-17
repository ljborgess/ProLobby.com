import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { randomUUID } from 'node:crypto'

import { HashService } from '../../common/auth/hash.service'
import { SESSION_TTL_SECONDS, type SessionTokenPayload } from '../../common/auth/session.constants'
import { Account } from './account.entity'
import { AccountState } from './account.enums'
import { FailedSignIn } from './failed-sign-in.entity'

/**
 * Failed sign-ins allowed per account inside FAILED_SIGN_IN_WINDOW_MS — item
 * 11 of the security checklist asks for a limit "por conta **e** por IP", and
 * the per-IP bucket (`login`, 5/min) is only the second half.
 *
 * Ten in fifteen minutes: a person who mistypes, tries their other password,
 * and mistypes again stays far below it, while a distributed attempt — a
 * thousand addresses trying the same account five times each — now hits a
 * ceiling that does not care how many addresses it comes from.
 *
 * The trade-off is deliberate: anyone who knows an address can spend that
 * account's window on purpose. The window is short and touches only the
 * password path; account recovery and password reset keep working, so a
 * targeted lock-out is an annoyance rather than a way to take someone out of
 * the platform.
 */
export const FAILED_SIGN_IN_MAX_PER_WINDOW = 10

export const FAILED_SIGN_IN_WINDOW_MS = 15 * 60 * 1000

@Injectable()
export class SessionService implements OnModuleInit {
  /**
   * An argon2 hash of a value nobody knows.
   *
   * Compared against when the email does not exist, so the failing path costs
   * the same argon2 verification as the succeeding one. Without it, "no such
   * account" returns in microseconds while "wrong password" pays the full
   * hash — and enumerating accounts becomes a matter of timing a request,
   * which RF-070 exists to prevent.
   */
  private decoyHash!: string

  constructor(
    private readonly em: EntityManager,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Computed at boot, not lazily on first sign-in.
   *
   * A memoised promise would keep a *rejected* result if argon2 ever failed
   * to initialise, and every later sign-in would throw there — including the
   * ones with the right password. A transient failure would become permanent
   * until the process restarted, for a reason invisible in any request log.
   * Failing the boot instead is loud and happens once.
   */
  async onModuleInit(): Promise<void> {
    this.decoyHash = await this.hashService.hash(randomUUID())
  }

  /**
   * Signs in — RF-022, RF-070.
   *
   * Signing in never invalidates another session: the same account may hold as
   * many as it likes, and the lock that matters (one queue entry) is per
   * account, not per session (docs/produto/05-produto/01-onboarding.md).
   */
  async signIn(email: string, password: string): Promise<{ token: string; account: Account }> {
    const account = await this.em.findOne(Account, { email: email.trim().toLowerCase() })

    // Read before the password is compared, so a spent window refuses even a
    // correct password.
    const spent = account ? await this.windowSpent(account) : false

    // Always exactly one argon2 verification, whichever branch is taken.
    const matches = await this.hashService.matches(
      password,
      account?.passwordHash ?? this.decoyHash,
    )

    // One answer for both "no such email" and "wrong password", because the
    // difference is exactly what must not be observable (item 15).
    if (!account || !matches) {
      if (account) {
        await this.recordFailure(account)
      }
      throw new UnauthorizedException('invalid_credentials')
    }

    // Same answer again, and deliberately so: a distinct "account locked"
    // would confirm the address exists and hand an enumerator the signal that
    // the decoy hash above is built to deny (RF-070). The correct password is
    // not recorded as a failure — the window punishes guessing, and extending
    // it here would only keep the real owner out for longer.
    if (spent) {
      throw new UnauthorizedException('invalid_credentials')
    }

    // A deleted account is gone; there is nothing to sign in to — and the
    // answer is 401, never 403, because 403 would confirm the account existed.
    //
    // Banned and suspended accounts *do* sign in. The guard is what narrows
    // what they reach (RF-081): a banned person keeps the right to appeal, and
    // may have no Discord to appeal through.
    if (account.state === AccountState.DELETED) {
      throw new UnauthorizedException('invalid_credentials')
    }

    // Signing in proves the owner is back, so the window starts clean. Without
    // this, a person who mistyped nine times would carry those nine for the
    // next quarter of an hour and lock themselves out on a single later slip.
    await this.em.nativeDelete(FailedSignIn, { account: account.id })

    const payload: SessionTokenPayload = { sub: account.id }

    return {
      token: await this.jwtService.signAsync(payload, { expiresIn: SESSION_TTL_SECONDS }),
      account,
    }
  }

  private async windowSpent(account: Account): Promise<boolean> {
    const recent = await this.em.count(FailedSignIn, {
      account: account.id,
      createdAt: { $gt: new Date(Date.now() - FAILED_SIGN_IN_WINDOW_MS) },
    })

    return recent >= FAILED_SIGN_IN_MAX_PER_WINDOW
  }

  /**
   * ponytail: this insert happens only when the address exists, so a failed
   * sign-in against a real account costs one extra write that a failed
   * sign-in against an unknown address does not. The same asymmetry already
   * exists in the `findOne` above (a row found versus not), and both are
   * dwarfed by the argon2 verification every path pays. If timing
   * enumeration ever becomes a real concern, the fix is to make the write
   * unconditional against a sentinel row, not to drop the counter.
   */
  private async recordFailure(account: Account): Promise<void> {
    const em = this.em.fork()
    em.persist(em.create(FailedSignIn, { account }))
    await em.flush()
  }
}
