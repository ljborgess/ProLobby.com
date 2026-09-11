import { Controller, Get } from '@nestjs/common'

import { Public } from '../auth/auth.decorators'

@Controller('health')
export class HealthController {
  // Public: a health check that needs a session cannot answer when auth is the
  // thing that is broken.
  @Public()
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' }
  }
}
