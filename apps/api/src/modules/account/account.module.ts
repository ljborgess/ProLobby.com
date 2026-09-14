import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { AccountController } from './account.controller'
import { Account } from './account.entity'
import { AccountService } from './account.service'
import { CapacityService } from './capacity.service'
import { EmailVerification } from './email-verification.entity'
import { EmailVerificationService } from './email-verification.service'
import { SessionController } from './session.controller'
import { SessionService } from './session.service'
import { TermsAcceptance } from './terms-acceptance.entity'

@Module({
  imports: [MikroOrmModule.forFeature([Account, EmailVerification, TermsAcceptance])],
  controllers: [AccountController, SessionController],
  providers: [AccountService, CapacityService, EmailVerificationService, SessionService],
  exports: [AccountService, EmailVerificationService],
})
export class AccountModule {}
