import { Controller, Get } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'

import { Public } from '../auth/auth.decorators'

@Controller('health')
export class HealthController {
  // Public: a health check that needs a session cannot answer when auth is the
  // thing that is broken.
  @Public()
  // Outside the rate limit, for two reasons. It is the container's own probe
  // (docker-compose.prod.yml, every 15s), so counting it spends a budget meant
  // for real callers — and it arrives from inside the container, with no
  // `CF-Connecting-IP`, which is precisely the condition
  // CfConnectingIpThrottlerGuard reports as "the limit just became global".
  // Left throttled, that warning would fire every minute forever and bury the
  // real event it exists to surface.
  @SkipThrottle()
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' }
  }
}
