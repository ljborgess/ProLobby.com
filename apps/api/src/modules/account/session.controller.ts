import { Body, Controller, Delete, HttpCode, HttpStatus, Post, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Response } from 'express'

import { Public } from '../../common/auth/auth.decorators'
import { SESSION_TTL_MS } from '../../common/auth/session.constants'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '../../common/security/session-cookie'
import { SignInDto } from './dto/sign-in.dto'
import { SessionService } from './session.service'

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * Sign in — RF-022.
   *
   * The token goes out as an `HttpOnly` cookie and never in the body: a body
   * token would have to be stored by JavaScript, which is what the cookie
   * exists to avoid (ADR-006).
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  // The login bucket: this is where guessing pays off, and a legitimate person
  // does not sign in six times a minute.
  @Throttle({ login: {} })
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ state: string }> {
    const { token, account } = await this.sessionService.signIn(dto.email, dto.password)

    response.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions(SESSION_TTL_MS))

    // The state is returned so the front end knows where to land: an
    // unverified account goes to the verification notice, a banned one to its
    // punishment and the appeal (RF-081).
    return { state: account.state }
  }

  /**
   * Sign out.
   *
   * Clears the cookie — and that is all it can do. There is no per-session
   * revocation (ADR-007), so a token captured beforehand keeps working until
   * it expires. The interface must not promise otherwise.
   */
  @Public()
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  signOut(@Res({ passthrough: true }) response: Response): void {
    // Cleared with the same options it was written with: a mismatch makes the
    // browser keep the original cookie, and the sign-out silently does nothing.
    response.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions(SESSION_TTL_MS))
  }
}
