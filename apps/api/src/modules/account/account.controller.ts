import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import { AllowStates, Public, SkipTermsCheck } from '../../common/auth/auth.decorators'
import type { RequestWithAccount } from '../../common/auth/session.guard'

import { AccountState } from './account.enums'
import { AccountService } from './account.service'
import { AcceptTermsDto } from './dto/accept-terms.dto'
import { ResendVerificationDto } from './dto/resend-verification.dto'
import { SignUpDto } from './dto/sign-up.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { EmailVerificationService } from './email-verification.service'

@Controller('accounts')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly emailVerificationService: EmailVerificationService,
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
}
