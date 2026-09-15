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
  await app.get(EventDeliveryService).recoverPending()
}

void bootstrap()
