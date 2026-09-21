import type { Throttle, ThrottlerModuleOptions } from '@nestjs/throttler'

/** What `@Throttle(...)` accepts — the library does not export this type. */
type ThrottleOptions = Parameters<typeof Throttle>[0]

/**
 * Rate limiting — item 11 of docs/requisitos/08-seguranca-checklist.md and
 * RNF-011.
 *
 * **One throttler, overridden per route.** An earlier version declared four
 * named throttlers (`default`, `login`, `signup`, `upload`) expecting a route
 * to be counted only by the bucket it opted into. That is not how the guard
 * works: it loops over *every* configured throttler on *every* route
 * (`ThrottlerGuard.canActivate`), and a named bucket is skipped only by an
 * explicit `@SkipThrottle`. The strict buckets therefore applied everywhere —
 * the real ceiling on any endpoint was 5 requests a minute, and 10 requests of
 * any kind blocked the caller for an hour. Nothing failed loudly; the limits
 * simply were not what the file said.
 *
 * With a single throttler, a route is counted once, by the limit it declares.
 * Nothing is lost by dropping the names: the key is
 * `Class-handler-throttlerName-tracker`, so two routes sharing a name never
 * shared a counter anyway.
 */
/**
 * Disables rate limiting — for tests of *other* rules, which would otherwise
 * fail by volume instead of by the rule they check.
 *
 * Refuses to work in production: a switch that turns off a security control
 * must not be one environment variable away from being on in the place it
 * matters. Rate limiting itself is proven in security.e2e-spec, which builds
 * its own module and never goes through here.
 */
export function throttlingDisabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.THROTTLE_DISABLED === 'true'
}

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: 'default',
      ttl: 60_000,
      limit: 120,
    },
  ],
}

/**
 * Login, password reset and anything that compares a secret. Tight on purpose:
 * a legitimate person does not sign in 6 times a minute, and this is the kind
 * of endpoint where guessing pays off.
 */
export const LOGIN_THROTTLE: ThrottleOptions = { default: { ttl: 60_000, limit: 5 } }

/**
 * Sign-up. Measured per *hour*, not per minute, because the threat here is
 * account farming and farming is counted by the day — a 5/min limit would
 * allow 300 accounts an hour from one address while looking strict. A real
 * person creates one account, maybe two.
 *
 * This is the crude per-IP guard only; item 12 of the security checklist
 * (proof the caller is not automated) is a separate concern, because farming
 * from many addresses walks straight past any per-IP limit.
 */
export const SIGNUP_THROTTLE: ThrottleOptions = { default: { ttl: 3_600_000, limit: 10 } }

/**
 * Screenshot upload. RF-065 caps 10 uploads per hour per *account*, which is
 * business logic and lives elsewhere; this is the cruder per-IP guard that
 * stops someone burning the OCR free tier before the account rule even runs.
 */
export const UPLOAD_THROTTLE: ThrottleOptions = { default: { ttl: 3_600_000, limit: 30 } }

/**
 * The bot's events (#150). One caller, many events: a raid that empties the
 * server is hundreds of "left" events in a minute, and the login bucket would
 * refuse most of them. The HMAC, not this limit, is what authenticates — this
 * only stops a leaked secret from being a free flood.
 */
export const BOT_EVENT_THROTTLE: ThrottleOptions = { default: { ttl: 60_000, limit: 300 } }
