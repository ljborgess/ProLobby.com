/**
 * Must match `CURRENT_TERMS_VERSION` in
 * `apps/api/src/modules/account/terms.constants.ts` exactly.
 *
 * Not shared code on purpose: the two apps don't share a runtime package for
 * this, and the API is the one that actually enforces it — a stale value
 * here just makes sign-up fail with `terms_version_outdated` instead of
 * silently recording consent to text nobody saw. Bump both together when the
 * Terms change.
 */
export const CURRENT_TERMS_VERSION = '2026-09-14'
