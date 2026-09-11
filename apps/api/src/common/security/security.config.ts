import { ValidationPipe, type INestApplication } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

/**
 * Everything the API needs in place *before* the first public endpoint exists.
 *
 * Items 8, 9, 11, 14 and 18 of docs/requisitos/08-seguranca-checklist.md.
 * Grouped in one function so a new entry point (tests, a worker, a second
 * bootstrap) cannot silently start without them — which is exactly how a
 * "global" pipe ends up missing from the process that actually serves traffic.
 */
export function applySecurity(app: INestApplication): void {
  // Item 18: security headers. helmet's defaults already cover
  // X-Content-Type-Options, frame-ancestors and HSTS; CSP stays off here
  // because this process serves JSON, not HTML — the page-level policy belongs
  // to apps/web, and a CSP on an API only creates a second place to maintain.
  app.use(helmet())

  app.use(cookieParser())

  // Item 9: the front end reads the session from an HttpOnly cookie, so the
  // browser must be allowed to send it. `credentials: true` is meaningless
  // without an explicit origin — the spec forbids `*` together with
  // credentials, and getting this wrong fails at runtime, in the browser only.
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  })

  // Items 8 and 14: validation is global, never per-controller. Per-controller
  // means every new endpoint is one `forgot the decorator` away from accepting
  // anything.
  app.useGlobalPipes(
    new ValidationPipe({
      // Strips properties with no decorator in the DTO...
      whitelist: true,
      // ...and rejects the request instead of silently dropping them. Silent
      // stripping hides the attempt: `{"reputation": 100}` would be ignored and
      // nobody would ever know it was sent.
      forbidNonWhitelisted: true,
      // Turns the plain body into the DTO class, which is what makes
      // `@Type(() => Date)` and numeric coercion work at all.
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      // Detailed messages are kept on purpose — a legitimate client needs to
      // know *which* field failed. This is the Nest default; it is spelled out
      // so nobody "hardens" it later without noticing the trade-off. What keeps
      // item 15 satisfied is that no DTO carries a sensitive field name, not
      // this flag.
      disableErrorMessages: false,
    }),
  )
}

/**
 * Allowed origins for CORS.
 *
 * Defaults to the local front end so a fresh clone works with no .env. In
 * production the variable is mandatory: a missing value must fail loudly at
 * boot, never fall back to something permissive.
 */
function corsOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CORS_ORIGINS is required in production')
    }
    return ['http://localhost:3000']
  }

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}
