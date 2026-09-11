import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { AccountController } from './account.controller'
import { Account } from './account.entity'
import { AccountService } from './account.service'
import { CapacityService } from './capacity.service'
import { SessionController } from './session.controller'
import { SessionService } from './session.service'

@Module({
  imports: [MikroOrmModule.forFeature([Account])],
  controllers: [AccountController, SessionController],
  providers: [AccountService, CapacityService, SessionService],
  exports: [AccountService],
})
export class AccountModule {}
