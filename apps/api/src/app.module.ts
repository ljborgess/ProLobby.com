import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import { AuthModule } from './common/auth/auth.module'
import { SessionGuard } from './common/auth/session.guard'
import mikroOrmConfig from './common/database/mikro-orm.config'
import { HealthController } from './common/health/health.controller'
import { throttlerConfig, throttlingDisabled } from './common/security/throttler.config'
import { AccountModule } from './modules/account/account.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    ThrottlerModule.forRoot({ ...throttlerConfig, skipIf: throttlingDisabled }),
    AuthModule,
    AccountModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global guard, not per-controller: rate limiting that has to be remembered
    // on each new endpoint is rate limiting that will be missing from the one
    // that needed it most.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Closed by default (ADR-007): a route with no decorator needs a session
    // and an active account. Forgetting one locks a route down, which gets
    // noticed — rather than opening one, which produces no error at all.
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
