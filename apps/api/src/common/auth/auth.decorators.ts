import { SetMetadata } from '@nestjs/common'

import type { AccountState } from '../../modules/account/account.enums'

export const IS_PUBLIC = 'auth:public'
export const ALLOWED_STATES = 'auth:allowed-states'
export const SKIP_TERMS_CHECK = 'auth:skip-terms-check'

/**
 * Opens a route to anyone, with no session at all.
 *
 * The guard is global and closed by default (ADR-007): a new route requires a
 * session and an active account unless it says otherwise. Forgetting a
 * decorator therefore locks a route down, which is noisy and gets fixed —
 * rather than opening one, which produces no error and nobody notices.
 */
export const Public = () => SetMetadata(IS_PUBLIC, true)

/**
 * Widens a route to account states beyond `ACTIVE`.
 *
 * Two real cases, both from the dossier:
 *
 * - `UNVERIFIED` browses profiles, rankings and history; it is only barred
 *   from the queue (RF-002).
 * - `BANNED` reaches exactly two things — its own punishment and the appeal
 *   (RF-081). Without that, the right to appeal granted by RF-037 would depend
 *   entirely on Discord, and someone banned for sign-up fraud may never have
 *   linked a Discord account at all.
 *
 * `DELETED` is never allowed anywhere, so it is not expressible here.
 */
export const AllowStates = (...states: AccountState[]) => SetMetadata(ALLOWED_STATES, states)

/**
 * Lets a route through for an account that has not accepted the latest
 * material terms (RF-026).
 *
 * Meant for exactly one route: the one that records the acceptance. Anything
 * else carrying it would let an account keep using the platform while
 * refusing the terms, which is the whole thing RF-026 blocks.
 */
export const SkipTermsCheck = () => SetMetadata(SKIP_TERMS_CHECK, true)
