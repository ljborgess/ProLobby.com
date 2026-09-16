import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import { AllowStates, Public, SkipTermsCheck } from '../../common/auth/auth.decorators'
import type { RequestWithAccount } from '../../common/auth/session.guard'

import { AccountState } from './account.enums'
import { AccountService } from './account.service'
import { AcceptTermsDto } from './dto/accept-terms.dto'
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto'
import { RequestPasswordResetDto } from './dto/request-password-reset.dto'
import { ResendVerificationDto } from './dto/resend-verification.dto'
import { SignUpDto } from './dto/sign-up.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { EmailVerificationService } from './email-verification.service'
import { PasswordResetService } from './password-reset.service'
import { PunishmentStatus, PunishmentStatusService } from './punishment-status.service'

@Controller('accounts')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly punishmentStatusService: PunishmentStatusService,
  ) {}

  /**
   * Sign-up — RF-019.
   *
   * Answers 202 with a fixed message whether the address was free or already
   * taken (RF-070). 201 Created would itself be the leak: the status code
   * would say an account was created, which is precisely what must not be
   * observable from outside.
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  // Its own bucket, counted per hour: the threat is account farming, and
  // farming is measured by the day. The login bucket would look strict at
  // 5/min and still allow 300 accounts an hour from one address.
  @Throttle({ signup: {} })
  async signUp(@Body() dto: SignUpDto): Promise<{ message: string }> {
    await this.accountService.signUp(dto)

    return { message: 'check_your_email' }
  }

  /**
   * Asks for a new verification link.
   *
   * Always 202, whatever happened — unknown address, already verified, or a
   * link on its way. Anything else would turn this into the oracle that the
   * sign-up endpoint carefully is not (RF-070).
   *
   * It exists because sign-up does not fail when the email provider does: an
   * account can be created with no link delivered, and this is the only way
   * back from that.
   */
  @Public()
  @Post('verifications/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  // The login bucket, not the signup one: the cost here is an email to
  // somebody else's inbox, so the limit guards a stranger, not this server.
  @Throttle({ login: {} })
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<{ message: string }> {
    await this.emailVerificationService.resend(dto.email)

    return { message: 'check_your_email' }
  }

  /**
   * Verifies an address — the gate RF-002 puts in front of the queue.
   *
   * POST, not GET, and deliberately: a GET that changes state would be
   * reachable by any link the person clicks elsewhere, and `SameSite: lax`
   * lets top-level GET navigation carry the session cookie. That is the exact
   * condition item 9b of the security checklist depends on staying true.
   *
   * It also keeps email scanners from consuming the token: plenty of corporate
   * mail gateways follow every link in a message before the human sees it.
   */
  @Public()
  @Post('verifications')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ login: {} })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.emailVerificationService.verify(dto.token)
  }

  /**
   * Asks for a password reset link — RF-024, RF-070.
   *
   * Always 202, and always at the same speed: the lookup, the insert and the
   * email all happen after the response. Awaiting any of them would make a
   * real account measurably slower than an unknown address, which enumerates
   * accounts with a stopwatch instead of a status code.
   */
  @Public()
  @Post('password-resets')
  @HttpCode(HttpStatus.ACCEPTED)
  // The login bucket: the cost of this endpoint is an email to somebody
  // else's inbox, so the limit guards a stranger, not this server.
  @Throttle({ login: {} })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto): { message: string } {
    this.passwordResetService.request(dto.email)

    return { message: 'check_your_email' }
  }

  /**
   * Sets a new password from a reset link — RF-024.
   *
   * POST, not GET, for the same reason as the verification route: `SameSite:
   * lax` lets a top-level GET carry the session cookie, and item 9b of the
   * security checklist rests on no GET ever changing state. It also keeps
   * corporate mail scanners from burning the link before the person opens it.
   */
  @Public()
  @Post('password-resets/confirmations')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ login: {} })
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto): Promise<void> {
    await this.passwordResetService.confirm(dto.token, dto.password)
  }

  /**
   * Accepts the current terms — RF-026.
   *
   * The one route an account without an up-to-date acceptance can still reach:
   * everything else answers 403 until this is done. Open to suspended and
   * unverified accounts too, because both are held at the same screen and
   * neither state should trap someone who is trying to comply.
   *
   * Banned accounts are left out: the terms check does not apply to them in the
   * first place (see SessionGuard), so they never need this route.
   */
  @Post('terms-acceptances')
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipTermsCheck()
  @AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED, AccountState.SUSPENDED)
  async acceptTerms(
    @Req() request: RequestWithAccount,
    @Body() dto: AcceptTermsDto,
  ): Promise<void> {
    // The guard has already authenticated; the id is all this needs, and
    // request.account itself is read-only (see RequestWithAccount).
    await this.accountService.acceptTerms(request.account!.id, dto.version)
  }

  /**
   * The account's own punishment, if it has one — gap found in the review of
   * #103. `suspensionEndsAt` and `@AllowStates(SUSPENDED)` had existed since
   * #75 and #82 respectively, and nothing put them together: a suspended
   * account logged in and got 403 from everything, with no way to tell a
   * suspension from a ban.
   *
   * `BANNED` is listed too — it is the other route RF-081 requires a banned
   * account to reach (the first is signing in itself, which never checks
   * state). This is not yet the whole of RF-081: filing the appeal is a
   * separate, unbuilt endpoint (RF-037), and `ModerationCase` has no link
   * from an appeal case back to the case it appeals, so this route cannot
   * say whether one is already open. It returns the case id so that future
   * endpoint has something to point at.
   */
  @Get('punishment-status')
  @AllowStates(AccountState.ACTIVE, AccountState.SUSPENDED, AccountState.BANNED)
  async punishmentStatus(@Req() request: RequestWithAccount): Promise<PunishmentStatus> {
    return this.punishmentStatusService.statusFor(request.account!)
  }
}
