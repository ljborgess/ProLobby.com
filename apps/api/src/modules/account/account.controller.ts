import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import { Public } from '../../common/auth/auth.decorators'

import { AccountService } from './account.service'
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
  // somebody else inbox, so the limit guards a stranger, not this server.
  @Throttle({ login: {} })
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<{ message: string }> {
    await this.emailVerificationService.resend(dto.email)

    return { message: 'check_your_email' }
  }

  @Public()
  @Post('verifications')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ login: {} })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.emailVerificationService.verify(dto.token)
  }
}
