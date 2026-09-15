import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { applySecurity } from './common/security/security.config'
import { EventDeliveryService } from './modules/bot-integration/event-delivery.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  applySecurity(app)
  await app.listen(process.env.PORT ?? 3001)

  // After listen, not OnModuleInit: e2e suites call app.init() before the
  // schema exists, and a boot query against a missing table would fail them.
  //
  // Failure here is logged, never thrown: the process is already serving
  // requests, and an unhandled rejection would kill it *after* it started.
  // The pending rows keep their `nextAttemptAt` and the next boot retries.
  try {
    await app.get(EventDeliveryService).recoverPending()
  } catch (error) {
    new Logger('bootstrap').error(
      'could not recover pending event deliveries',
      error instanceof Error ? error.stack : undefined,
    )
  }
}

void bootstrap()
