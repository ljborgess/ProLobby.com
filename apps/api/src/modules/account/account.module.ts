import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { ModerationCase } from '../moderation/moderation-case.entity'
import { ReputationEvent } from '../ranking/reputation-event.entity'
import { AccountCleanupJob } from './account-cleanup.job'
import { AccountRecoveryService } from './account-recovery.service'
import { AccountController } from './account.controller'
import { Account } from './account.entity'
import { AccountService } from './account.service'
import { CapacityService } from './capacity.service'
import { DiscordPresenceService } from './discord-presence.service'
import { DiscordLinkState } from './discord-link-state.entity'
import { DiscordLinkService } from './discord-link.service'
import { DiscordOAuth, createDiscordOAuth } from './discord-oauth'
import { EmailVerification } from './email-verification.entity'
import { EmailVerificationService } from './email-verification.service'
import { FailedSignIn } from './failed-sign-in.entity'
import { PasswordReset } from './password-reset.entity'
import { PasswordResetService } from './password-reset.service'
import { PunishmentAppealService } from './punishment-appeal.service'
import { PunishmentStatusService } from './punishment-status.service'
import { SessionController } from './session.controller'
import { SessionService } from './session.service'
import { TermsAcceptance } from './terms-acceptance.entity'
import { WaitingListEntry } from './waiting-list-entry.entity'
import { WaitingListService } from './waiting-list.service'

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Account,
      DiscordLinkState,
      EmailVerification,
      FailedSignIn,
      PasswordReset,
      TermsAcceptance,
      ModerationCase,
      ReputationEvent,
      WaitingListEntry,
    ]),
  ],
  controllers: [AccountController, SessionController],
  providers: [
    AccountCleanupJob,
    AccountRecoveryService,
    AccountService,
    CapacityService,
    DiscordPresenceService,
    DiscordLinkService,
    { provide: DiscordOAuth, useFactory: createDiscordOAuth },
    EmailVerificationService,
    PasswordResetService,
    PunishmentAppealService,
    PunishmentStatusService,
    SessionService,
    WaitingListService,
  ],
  exports: [AccountService, DiscordPresenceService, EmailVerificationService],
})
export class AccountModule {}
