import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Response } from 'express'

import { SESSION_TTL_MS } from '../../common/auth/session.constants'
import type { RequestWithAccount } from '../../common/auth/session.guard'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '../../common/security/session-cookie'
import { LOGIN_THROTTLE } from '../../common/security/throttler.config'
import { TwoFactorCodeDto, TwoFactorEnrollmentDto } from './dto/two-factor-code.dto'
import { TwoFactorService, type TwoFactorStatus } from './two-factor.service'

/**
 * The panel's second factor — #311. Behind the ordinary session: the person
 * has already signed in with the password; this upgrades that session.
 */
@Controller()
export class TwoFactorController {
  constructor(private readonly twoFactor: TwoFactorService) {}

  @Get('accounts/me/two-factor')
  status(@Req() request: RequestWithAccount): TwoFactorStatus {
    return this.twoFactor.status(request.account!, request.secondFactor ?? false)
  }

  /**
   * Shows the secret once, for the authenticator app, against the enrollment
   * code an admin handed over. Starting over replaces the secret.
   */
  @Post('accounts/me/two-factor/setup')
  @HttpCode(HttpStatus.OK)
  @Throttle(LOGIN_THROTTLE)
  setup(
    @Req() request: RequestWithAccount,
    @Body() dto: TwoFactorEnrollmentDto,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    return this.twoFactor.setup(request.account!.id, dto.enrollmentCode)
  }

  @Post('accounts/me/two-factor/activation')
  @HttpCode(HttpStatus.OK)
  @Throttle(LOGIN_THROTTLE)
  async activate(
    @Req() request: RequestWithAccount,
    @Body() dto: TwoFactorCodeDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ recoveryCodes: string[] }> {
    const { recoveryCodes, token } = await this.twoFactor.activate(request.account!.id, dto.code)
    response.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions(SESSION_TTL_MS))
    return { recoveryCodes }
  }

  /** Six digits are guessable at scale: the login bucket applies here too. */
  @Post('sessions/two-factor')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(LOGIN_THROTTLE)
  async verify(
    @Req() request: RequestWithAccount,
    @Body() dto: TwoFactorCodeDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = await this.twoFactor.verify(request.account!.id, dto.code)
    response.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions(SESSION_TTL_MS))
  }
}
