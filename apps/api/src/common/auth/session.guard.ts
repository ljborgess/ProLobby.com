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
import { TermsAcceptance } from '../../modules/account/terms-acceptance.entity'
import {
  CURRENT_TERMS_VERSION,
  LATEST_MATERIAL_TERMS_VERSION,
} from '../../modules/account/terms.constants'
import { SESSION_COOKIE_NAME } from '../security/session-cookie'
import { ALLOWED_STATES, IS_PUBLIC, SKIP_TERMS_CHECK } from './auth.decorators'
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
    const em = this.em.fork()
    const account = await em.findOne(Account, { id: payload.sub })

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

    const skipTermsCheck = this.reflector.getAllAndOverride<boolean>(SKIP_TERMS_CHECK, [
      context.getHandler(),
      context.getClass(),
    ])

    // RF-026: after a material change, the account is held at the acceptance
    // screen until it accepts. Checked after the state, so a suspended or
    // banned account is told about its state first — that is the more urgent
    // thing to know.
    //
    // Banned accounts are exempt. What a banned person reaches is its own
    // punishment and the appeal (RF-081): that is exercising a right, not
    // using the platform, and conditioning an appeal on accepting new terms
    // would make the right depend on consent.
    if (!skipTermsCheck && account.state !== AccountState.BANNED) {
      const accepted = await em.count(TermsAcceptance, {
        account: account.id,
        // Versions are ISO dates, so "at or after the last material change" is
        // a string comparison. A non-material revision does not ask anyone again.
        version: { $gte: LATEST_MATERIAL_TERMS_VERSION },
      })

      if (accepted === 0) {
        throw new ForbiddenException({
          message: 'terms_acceptance_required',
          // What the front end needs to render the acceptance screen, and no
          // more.
          currentVersion: CURRENT_TERMS_VERSION,
        })
      }
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
