import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { randomUUID } from 'node:crypto'

import { HashService } from '../../common/auth/hash.service'
import { SESSION_TTL_SECONDS, type SessionTokenPayload } from '../../common/auth/session.constants'
import { Account } from './account.entity'
import { AccountState } from './account.enums'

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

    // Always exactly one argon2 verification, whichever branch is taken.
    const matches = await this.hashService.matches(
      password,
      account?.passwordHash ?? this.decoyHash,
    )

    // One answer for both "no such email" and "wrong password", because the
    // difference is exactly what must not be observable (item 15).
    if (!account || !matches) {
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

    const payload: SessionTokenPayload = { sub: account.id }

    return {
      token: await this.jwtService.signAsync(payload, { expiresIn: SESSION_TTL_SECONDS }),
      account,
    }
  }
}
