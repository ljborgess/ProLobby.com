import { MikroOrmModule } from '@mikro-orm/nestjs'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_PIPE } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

import { AuthModule } from './common/auth/auth.module'
import { SessionGuard } from './common/auth/session.guard'
import mikroOrmConfig from './common/database/mikro-orm.config'
import { CfConnectingIpThrottlerGuard } from './common/security/cf-connecting-ip-throttler.guard'
import { HealthController } from './common/health/health.controller'
import { MailModule } from './common/mail/mail.module'
import { globalValidationPipe } from './common/security/security.config'
import { throttlerConfig, throttlingDisabled } from './common/security/throttler.config'
import { AccountModule } from './modules/account/account.module'
import { BotIntegrationModule } from './modules/bot-integration/bot-integration.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    // Registered once, at the root — feature modules just declare @Cron()
    // providers (AccountCleanupJob is the first) and this is what makes them
    // fire. #106.
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({ ...throttlerConfig, skipIf: throttlingDisabled }),
    AuthModule,
    MailModule,
    AccountModule,
    BotIntegrationModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: the throttler runs first, so an unauthenticated flood is
    // refused before it costs a JWT verification and a database read.
    { provide: APP_GUARD, useClass: CfConnectingIpThrottlerGuard },
    // Closed by default (ADR-007): a route with no decorator needs a session
    // and an active account. Forgetting one locks a route down, which gets
    // noticed — rather than opening one, which produces no error at all.
    { provide: APP_GUARD, useClass: SessionGuard },
    // Registered here, not in the bootstrap, so every app built from this
    // module validates input — including the ones tests create. A pipe that
    // lives only in main.ts is absent from every test, and a test passing
    // against an unvalidated app proves nothing.
    { provide: APP_PIPE, useValue: globalValidationPipe },
  ],
})
export class AppModule implements NestModule {
  /**
   * Security headers and cookie parsing, for the same reason as the pipe
   * above: wired into the module, so no entry point can start without them.
   *
   * Cookie parsing in particular is load-bearing — the session guard reads the
   * token from `request.cookies`, and without the parser every authenticated
   * route would answer 401 with nothing explaining why.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        // CSP stays off: this process serves JSON, not HTML, and the page
        // policy belongs to apps/web. Enabling it here would create a second
        // place to maintain the same rule, and the two would drift.
        helmet(),
        cookieParser(),
      )
      .forRoutes('*')
  }
}
