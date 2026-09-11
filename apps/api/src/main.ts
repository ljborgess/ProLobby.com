import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { applySecurity } from './common/security/security.config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  applySecurity(app)
  await app.listen(process.env.PORT ?? 3001)
}

void bootstrap()
