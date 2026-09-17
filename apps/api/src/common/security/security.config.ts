import { ValidationPipe } from '@nestjs/common'
import type { INestApplication } from '@nestjs/common'

/**
 * The global validation pipe — items 8 and 14 of the security checklist.
 *
 * Exported as a value rather than applied here, because it is registered as
 * `APP_PIPE` in AppModule: whatever is wired into the module cannot be
 * forgotten by whoever creates the app. That matters more than it sounds — a
 * pipe applied only in `main.ts` is absent from every test, and a test passing
 * against an unvalidated app proves nothing about production.
 */
export const globalValidationPipe = new ValidationPipe({
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
  // Detailed messages are kept on purpose — a legitimate client needs to know
  // *which* field failed. This is the Nest default; it is spelled out so nobody
  // "hardens" it later without noticing the trade-off. What keeps item 15
  // satisfied is that no DTO carries a sensitive field name, not this flag.
  disableErrorMessages: false,
})

/**
 * The pieces that cannot live inside the module, because they are configured
 * on the application object rather than through a provider or middleware.
 *
 * Everything that *can* live in AppModule (validation, helmet, cookie
 * parsing) does, precisely so this function stays this small: the less it
 * does, the less forgetting to call it can break.
 *
 * The route prefix is here and not in `main.ts` for the same reason the
 * validation pipe is in AppModule: `main.ts` runs in production and in no
 * test at all. A prefix that exists only there would leave every e2e suite
 * calling `/accounts` and passing, while production served `/api/accounts` —
 * green tests proving the wrong routing.
 */
export function applySecurity(app: INestApplication): void {
  // ADR-009: the tunnel routes `prolobby.com.br/api/*` here and everything
  // else to the Next.js app, which owns its own server-side handlers under
  // `/bff/*`. The two must not claim the same prefix — when they did, the
  // tunnel won and the handler that forwards `CF-Connecting-IP` and relays
  // the session cookie never ran.
  app.setGlobalPrefix('api')

  // Item 9: the front end reads the session from an HttpOnly cookie, so the
  // browser must be allowed to send it. `credentials: true` is meaningless
  // without an explicit origin — the spec forbids `*` together with
  // credentials, and getting this wrong fails at runtime, in the browser only.
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  })
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
