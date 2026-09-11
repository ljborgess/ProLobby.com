import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'

import { HashService } from '../../common/auth/hash.service'
import { AccountController } from './account.controller'
import { Account } from './account.entity'
import { AccountService } from './account.service'
import { CapacityService } from './capacity.service'

@Module({
  imports: [MikroOrmModule.forFeature([Account])],
  controllers: [AccountController],
  providers: [AccountService, CapacityService, HashService],
  exports: [AccountService],
})
export class AccountModule {}
