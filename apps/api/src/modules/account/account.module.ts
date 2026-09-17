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
import { EmailVerification } from './email-verification.entity'
import { EmailVerificationService } from './email-verification.service'
import { PasswordReset } from './password-reset.entity'
import { PasswordResetService } from './password-reset.service'
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
      EmailVerification,
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
    EmailVerificationService,
    PasswordResetService,
    PunishmentStatusService,
    SessionService,
    WaitingListService,
  ],
  exports: [AccountService, EmailVerificationService],
})
export class AccountModule {}
