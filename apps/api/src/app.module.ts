import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'

import { HealthController } from './common/health/health.controller'
import { throttlerConfig } from './common/security/throttler.config'

// MikroORM lands here (@mikro-orm/nestjs) when the first endpoint needs the
// database — see docs/requisitos/03-dados.md and ADR-006.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ThrottlerModule.forRoot(throttlerConfig)],
  controllers: [HealthController],
  providers: [
    // Global guard, not per-controller: rate limiting that has to be remembered
    // on each new endpoint is rate limiting that will be missing from the one
    // that needed it most.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
