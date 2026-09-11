import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import { Public } from '../../common/auth/auth.decorators'

import { AccountService } from './account.service'
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
  @Public()
  @Post('verifications')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ login: {} })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.emailVerificationService.verify(dto.token)
  }
}
