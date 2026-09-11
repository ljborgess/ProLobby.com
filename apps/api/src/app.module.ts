import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import mikroOrmConfig from './common/database/mikro-orm.config'
import { HealthController } from './common/health/health.controller'
import { throttlerConfig, throttlingDisabled } from './common/security/throttler.config'
import { AccountModule } from './modules/account/account.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    ThrottlerModule.forRoot({ ...throttlerConfig, skipIf: throttlingDisabled }),
    AccountModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global guard, not per-controller: rate limiting that has to be remembered
    // on each new endpoint is rate limiting that will be missing from the one
    // that needed it most.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
