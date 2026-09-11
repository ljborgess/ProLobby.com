import type { ThrottlerModuleOptions } from '@nestjs/throttler'

/**
 * Rate limiting — item 11 of docs/requisitos/08-seguranca-checklist.md and
 * RNF-011.
 *
 * Three named buckets instead of one global number, because the limits that
 * matter are per *kind* of action: brute force on login, mass scraping of
 * public profiles, and OCR cost on uploads are different problems with
 * different thresholds. A single global limit would be either useless for
 * login or punishing for normal browsing.
 *
 * Endpoints opt into the strict buckets with `@Throttle({ login: {} })`;
 * anything that says nothing gets `default`.
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
    {
      // Login, password reset and anything that compares a secret. Tight on
      // purpose: a legitimate person does not sign in 6 times a minute, and
      // this is the endpoint where guessing pays off.
      name: 'login',
      ttl: 60_000,
      limit: 5,
    },
    {
      // Sign-up. Measured per *hour*, not per minute, because the threat here
      // is account farming and farming is counted by the day — the login
      // bucket (5/min) would allow 300 accounts an hour from one address while
      // looking strict. A real person creates one account, maybe two.
      //
      // This is the crude per-IP guard only; item 12 of the security checklist
      // (proof the caller is not automated) is a separate concern, because
      // farming from many addresses walks straight past any per-IP limit.
      name: 'signup',
      ttl: 3_600_000,
      limit: 10,
    },
    {
      // Screenshot upload. RF-065 caps 10 uploads per hour per *account*,
      // which is business logic and lives elsewhere; this is the cruder
      // per-IP guard that stops someone burning the OCR free tier before the
      // account rule even runs.
      name: 'upload',
      ttl: 3_600_000,
      limit: 30,
    },
  ],
}
