import { EntityManager } from '@mikro-orm/postgresql'
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'

import { Account } from '../../modules/account/account.entity'
import { AccountState } from '../../modules/account/account.enums'
import { SESSION_COOKIE_NAME } from '../security/session-cookie'
import { ALLOWED_STATES, IS_PUBLIC } from './auth.decorators'
import type { SessionTokenPayload } from './session.constants'

/**
 * The authenticated account, attached to the request for handlers to read.
 *
 * **Read-only.** It comes from a forked EntityManager owned by the guard, not
 * by the request handler — mutating it and calling flush() would write through
 * an EM nobody else knows about, landing the change in a different identity map
 * than everything else in the request. A handler that needs to write reloads the
 * account by id, in its own EM.
 */
export interface RequestWithAccount extends Request {
  account?: Account
}

/**
 * Global guard — ADR-007.
 *
 * Closed by default: every route needs a valid session and an `ACTIVE`
 * account. `@Public()` opens one; `@AllowStates()` widens which states pass.
 *
 * Reads the account from the database on every request, deliberately. The
 * token carries only an id, so a ban, a suspension or a role change takes
 * effect on the next request rather than whenever the token expires — the
 * whole reason RF-079 does not quietly stop working for seven days.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly em: EntityManager,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestWithAccount>()
    const token = readToken(request)

    if (!token) {
      throw new UnauthorizedException('missing_session')
    }

    let payload: SessionTokenPayload

    try {
      payload = await this.jwtService.verifyAsync<SessionTokenPayload>(token)
    } catch {
      // Expired, tampered with, or signed by a secret that is no longer in use
      // — rotating JWT_SECRET lands here for everyone at once, which is the
      // emergency revocation described in RNF-021.
      throw new UnauthorizedException('invalid_session')
    }

    // fork() because the guard runs outside the request's ORM context. What it
    // returns is read-only for handlers — see RequestWithAccount.
    const account = await this.em.fork().findOne(Account, { id: payload.sub })

    // A valid token for an account that no longer exists: LGPD deletion, in
    // practice. Never a 403 — there is nothing to forbid.
    if (!account) {
      throw new UnauthorizedException('invalid_session')
    }

    const allowedStates = this.reflector.getAllAndOverride<AccountState[]>(ALLOWED_STATES, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [AccountState.ACTIVE]

    // DELETED never passes, even if a route lists it by mistake.
    if (account.state === AccountState.DELETED || !allowedStates.includes(account.state)) {
      throw new ForbiddenException({
        message: 'account_state_not_allowed',
        // The state is the one thing the person genuinely needs to know: it is
        // about their own account, and RF-081 requires a banned account to
        // find its way to the appeal.
        state: account.state,
      })
    }

    request.account = account

    return true
  }
}

/**
 * Reads the token from the cookie, never from a header.
 *
 * A bearer header would mean JavaScript can hold the token, which defeats the
 * `HttpOnly` cookie the whole session design rests on (ADR-006): an XSS would
 * walk away with it instead of merely acting inside the page.
 */
function readToken(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, string> | undefined

  return cookies?.[SESSION_COOKIE_NAME]
}
