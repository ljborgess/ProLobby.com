import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { HashService } from '../../common/auth/hash.service'
import { SESSION_TTL_SECONDS, type SessionTokenPayload } from '../../common/auth/session.constants'
import { Account } from './account.entity'
import { AccountState } from './account.enums'

/**
 * An argon2 hash of a value nobody knows, computed once at boot.
 *
 * Compared against when the email does not exist, so that the failing path
 * costs the same argon2 verification as the succeeding one. Without it the
 * "no such account" answer returns in microseconds while "wrong password"
 * takes the full hash — and email enumeration becomes a matter of timing a
 * request, which RF-070 exists to prevent.
 */
let decoyHash: Promise<string> | undefined

@Injectable()
export class SessionService {
  constructor(
    private readonly em: EntityManager,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
  ) {
    decoyHash ??= this.hashService.hash(`decoy-${Math.random()}`)
  }

  /**
   * Signs in — RF-022, RF-070.
   *
   * Logging in never invalidates another session: the same account may hold as
   * many as it likes, and the lock that matters (one queue entry) is per
   * account, not per session (docs/produto/05-produto/01-onboarding.md).
   */
  async signIn(email: string, password: string): Promise<{ token: string; account: Account }> {
    const account = await this.em.findOne(Account, { email: email.trim().toLowerCase() })

    // Always one argon2 verification, whichever branch is taken.
    const matches = await this.hashService.matches(
      password,
      account?.passwordHash ?? (await decoyHash!),
    )

    // One message for both "no such email" and "wrong password", because the
    // difference is exactly what must not be observable (item 15).
    if (!account || !matches) {
      throw new UnauthorizedException('invalid_credentials')
    }

    // A deleted account is gone; there is nothing to sign in to. Banned and
    // suspended accounts *do* sign in — the guard is what narrows what they
    // reach (RF-081), because a banned person still has the right to appeal
    // and may have no Discord to appeal through.
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
