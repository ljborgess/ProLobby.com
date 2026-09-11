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
