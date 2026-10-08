import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { CharacterModule } from '../character/character.module'
import { ModerationCase } from '../moderation/moderation-case.entity'
import { ReputationEvent } from '../ranking/reputation-event.entity'
import { AccountCleanupJob } from './account-cleanup.job'
import { AccountRecoveryService } from './account-recovery.service'
import { AccountController } from './account.controller'
import { Account } from './account.entity'
import { AccountService } from './account.service'
import { CapacityService } from './capacity.service'
import { DeclaredClub } from './declared-club.entity'
import { DeclaredClubController } from './declared-club.controller'
import { DiscordPresenceService } from './discord-presence.service'
import { DiscordLinkState } from './discord-link-state.entity'
import { DiscordLinkService } from './discord-link.service'
import { DiscordOAuth, createDiscordOAuth } from './discord-oauth'
import { EmailVerification } from './email-verification.entity'
import { EmailVerificationService } from './email-verification.service'
import { ExpiredRowsService } from './expired-rows.service'
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
    CharacterModule,
    MikroOrmModule.forFeature([
      Account,
      DeclaredClub,
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
  controllers: [AccountController, DeclaredClubController, SessionController],
  providers: [
    AccountCleanupJob,
    AccountRecoveryService,
    AccountService,
    CapacityService,
    DiscordPresenceService,
    DiscordLinkService,
    { provide: DiscordOAuth, useFactory: createDiscordOAuth },
    EmailVerificationService,
    ExpiredRowsService,
    PasswordResetService,
    PunishmentAppealService,
    PunishmentStatusService,
    SessionService,
    WaitingListService,
  ],
  exports: [AccountService, DiscordPresenceService, EmailVerificationService],
})
export class AccountModule {}
