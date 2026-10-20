import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { memoryStorage } from 'multer'

import { AllowStates, Public, SkipTermsCheck } from '../../common/auth/auth.decorators'
import type { RequestWithAccount } from '../../common/auth/session.guard'
import { LOGIN_THROTTLE, SIGNUP_THROTTLE } from '../../common/security/throttler.config'
import { CharacterService } from '../character/character.service'
import type { ModerationCase } from '../moderation/moderation-case.entity'
import { reputationBand } from '../ranking/reputation.service'

import { AccountRecoveryService } from './account-recovery.service'
import { AccountState } from './account.enums'
import { AccountService } from './account.service'
import { AcceptTermsDto } from './dto/accept-terms.dto'
import { CompleteDiscordLinkDto } from './dto/complete-discord-link.dto'
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto'
import { JoinWaitingListDto } from './dto/join-waiting-list.dto'
import { OpenPunishmentAppealDto } from './dto/open-punishment-appeal.dto'
import { RequestAccountRecoveryDto } from './dto/request-account-recovery.dto'
import { RequestPasswordResetDto } from './dto/request-password-reset.dto'
import { ResendVerificationDto } from './dto/resend-verification.dto'
import { SignUpDto } from './dto/sign-up.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { DiscordLinkService } from './discord-link.service'
import { EmailVerificationService } from './email-verification.service'
import { detectRealImageType } from './evidence-image'
import { PasswordResetService } from './password-reset.service'
import { PunishmentAppealService } from './punishment-appeal.service'
import { PunishmentStatus, PunishmentStatusService } from './punishment-status.service'
import type { QueuePrerequisites } from './queue-prerequisites'
import { WaitingListService } from './waiting-list.service'

/** Item 16 of the security checklist: 10 MB, checked before anything is read. */
const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024
const DECLARED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

@Controller('accounts')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly accountRecoveryService: AccountRecoveryService,
    private readonly punishmentStatusService: PunishmentStatusService,
    private readonly punishmentAppealService: PunishmentAppealService,
    private readonly waitingListService: WaitingListService,
    private readonly discordLinkService: DiscordLinkService,
    private readonly characterService: CharacterService,
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
  @Throttle(SIGNUP_THROTTLE)
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
  @Post('verifications/resends')
  @HttpCode(HttpStatus.ACCEPTED)
  // The login bucket, not the signup one: the cost here is an email to
  // somebody else's inbox, so the limit guards a stranger, not this server.
  @Throttle(LOGIN_THROTTLE)
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
  @Throttle(LOGIN_THROTTLE)
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
  @Throttle(LOGIN_THROTTLE)
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
  @Throttle(LOGIN_THROTTLE)
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
  @Post('me/terms-acceptances')
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
   * Opens an account recovery case — RF-025, RF-070.
   *
   * Always 202 with the same message: whether the address exists, whether the
   * security answer matched, whether a case was actually opened — none of it
   * is observable here. See AccountRecoveryService for where the real work,
   * and the enumeration guard, happens.
   *
   * The file checks below (missing, oversized, wrong format) are ordinary
   * input validation, not account-related, so they answer immediately and
   * plainly — a 400 here reveals nothing about any account.
   */
  @Public()
  @Post('recovery-cases')
  @HttpCode(HttpStatus.ACCEPTED)
  // The login bucket: this compares a secret (the security answer), same
  // family as sign-in and password reset.
  @Throttle(LOGIN_THROTTLE)
  @UseInterceptors(
    FileInterceptor('evidence', {
      storage: memoryStorage(),
      limits: { fileSize: EVIDENCE_MAX_BYTES },
      fileFilter: (_req, file, callback) => {
        callback(null, DECLARED_IMAGE_TYPES.includes(file.mimetype))
      },
    }),
  )
  requestAccountRecovery(
    @Body() dto: RequestAccountRecoveryDto,
    @UploadedFile() evidence?: Express.Multer.File,
  ): { message: string } {
    if (!evidence) {
      // Missing entirely, or rejected by fileFilter above (wrong declared
      // type or none at all). Either way it never reached multer's buffer.
      throw new BadRequestException('evidence_required')
    }

    // fileFilter only saw the declared Content-Type, which the client
    // controls; this reads the bytes it cannot fake (item 16 checklist).
    const realType = detectRealImageType(evidence.buffer)
    if (!realType) {
      throw new BadRequestException('evidence_not_an_image')
    }

    this.accountRecoveryService.request(dto.email, dto.securityAnswer, evidence.buffer, realType)

    return { message: 'recovery_request_received' }
  }

  /**
   * What the person still has to do before the queue will take them — RF-002,
   * issue #171.
   *
   * Booleans in the order RF-002 fixes for the refusal message (email →
   * character → Discord), so the screen and that message never disagree
   * about the order, plus the account's own reputation and its band (#208). One count query for the character; the rest is
   * the account the guard already loaded.
   */
  @Get('me/queue-prerequisites')
  @AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED)
  async queuePrerequisites(@Req() request: RequestWithAccount): Promise<QueuePrerequisites> {
    const account = request.account!

    return {
      emailVerified: account.emailVerified,
      characterVerified: await this.characterService.hasVerified(account.id),
      discordLinked: account.discordIdHash != null,
      discordPresent: account.discordPresent,
      reputation: account.reputation,
      reputationBand: reputationBand(account.reputation),
    }
  }

  /**
   * Re-sends the verification link to *this* account — issue #171.
   *
   * The public sibling (`verifications/resends`) takes an address in the body,
   * which a signed-in screen cannot use: the account's own email is never part
   * of a response (item 17), so the page does not know it. This one reads it
   * from the session instead.
   *
   * Always 202, like the public one: whether the address was already verified
   * is not observable, and there is nothing else to say.
   */
  @Post('me/verifications/resends')
  @HttpCode(HttpStatus.ACCEPTED)
  @AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED)
  // The login bucket: the cost is an email leaving the platform, and the
  // per-account limit inside the service is what stops a flood of one inbox.
  @Throttle(LOGIN_THROTTLE)
  async resendMyVerification(@Req() request: RequestWithAccount): Promise<{ message: string }> {
    await this.emailVerificationService.resend(request.account!.email)

    return { message: 'check_your_email' }
  }

  /**
   * Whether the Discord is linked — what the account screen shows. A GET with
   * no side effect (item 9b), and a boolean only: never the ID or its hash.
   */
  @Get('me/discord-link')
  @AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED)
  async currentDiscordLink(@Req() request: RequestWithAccount): Promise<{ linked: boolean }> {
    return { linked: await this.discordLinkService.isLinked(request.account!.id) }
  }

  /**
   * Starts the Discord link — #149. Returns where to send the person; the state
   * and PKCE pair behind that URL are recorded here, single use, for 10 minutes.
   *
   * POST, not GET: it writes a row, and item 9b of the security checklist rests
   * on no GET ever changing state. Open to an unverified email too — the link is
   * a queue prerequisite (RF-002), not a reward for verifying, and RF-055 says
   * any arrival order is normal.
   */
  @Post('me/discord-link/attempts')
  @HttpCode(HttpStatus.CREATED)
  @AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED)
  @Throttle(LOGIN_THROTTLE)
  async startDiscordLink(
    @Req() request: RequestWithAccount,
  ): Promise<{ authorizationUrl: string }> {
    return this.discordLinkService.start(request.account!.id)
  }

  /**
   * Finishes the Discord link. The `apps/web` callback forwards here as a POST
   * with the session cookie, so `client_secret` never leaves this process and no
   * GET on this API changes state (item 9b).
   */
  @Put('me/discord-link')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED)
  @Throttle(LOGIN_THROTTLE)
  async completeDiscordLink(
    @Req() request: RequestWithAccount,
    @Body() dto: CompleteDiscordLinkDto,
  ): Promise<void> {
    await this.discordLinkService.complete(request.account!.id, dto.state, dto.code)
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
   * state). Filing the appeal itself is the separate route below
   * (`me/punishment/appeals`); the case id this returns is what that route
   * points the appeal at.
   */
  @Get('me/punishment')
  @AllowStates(AccountState.ACTIVE, AccountState.SUSPENDED, AccountState.BANNED)
  async punishmentStatus(@Req() request: RequestWithAccount): Promise<PunishmentStatus> {
    return this.punishmentStatusService.statusFor(request.account!)
  }

  /**
   * Joins the sign-up waiting list — RF-078.
   *
   * Always 202, idempotent: the screen that calls this only appears after
   * sign-up itself answered `signup_paused`, so there is no unknown-address
   * case to keep indistinguishable here the way RF-070 requires elsewhere —
   * this address never had a chance to have an account.
   *
   * This is capture only. The email sent *when sign-up reopens* needs
   * something to notice that it reopened and run once — a scheduled job,
   * which does not exist yet (#106). Building one as a side effect of this
   * endpoint would be solving that issue by accident, in the wrong place.
   */
  @Public()
  @Post('waiting-list-entries')
  @HttpCode(HttpStatus.ACCEPTED)
  // The signup bucket: an unauthenticated write of an email address, same
  // per-hour farming concern as creating the account itself.
  @Throttle(SIGNUP_THROTTLE)
  async joinWaitingList(@Body() dto: JoinWaitingListDto): Promise<{ message: string }> {
    await this.waitingListService.join(dto.email)

    return { message: 'added_to_waiting_list' }
  }

  /**
   * Files an appeal against the account's own punishment — RF-081, RF-037.
   *
   * Authenticated, unlike recovery-cases: a banned account signs in
   * normally (ADR-007) and reaches this like any other route it is allowed.
   * There is no enumeration concern to hide behind a fixed response — the
   * account is already known — so a real 400/409 on failure is the honest
   * answer, not a fixed 202.
   *
   * Suspended or banned: one appeal per punishment (RF-037, #160).
   */
  @Post('me/punishment/appeals')
  @HttpCode(HttpStatus.CREATED)
  @AllowStates(AccountState.SUSPENDED, AccountState.BANNED)
  // The login bucket: filing an appeal is a rare, deliberate action for a
  // real account, the same profile as password reset or sign-in.
  @Throttle(LOGIN_THROTTLE)
  async openPunishmentAppeal(
    @Req() request: RequestWithAccount,
    @Body() dto: OpenPunishmentAppealDto,
  ): Promise<{ caseId: string }> {
    const appeal: ModerationCase = await this.punishmentAppealService.open(
      request.account!,
      dto.message,
    )

    return { caseId: appeal.id }
  }
}
