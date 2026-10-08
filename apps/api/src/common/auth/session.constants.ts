/**
 * Session lifetime — ADR-007, and docs/produto/parametros.md.
 *
 * Seven fixed days, with no sliding renewal. With no per-session revocation,
 * this number *is* how long a stolen token keeps working, so it lives in one
 * place: the JWT expiry and the cookie `maxAge` both read from here, and
 * cannot drift apart into one outliving the other.
 */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000

/**
 * What the token carries: the account id, and nothing else.
 *
 * No role, no state, no permissions — ADR-007. Those are read from the
 * database on every authenticated request, which is what makes a ban or a
 * suspension take effect on the *next* request instead of whenever the token
 * happens to expire. With the state inside the token, a banned account would
 * keep entering the queue for up to seven days.
 */
export interface SessionTokenPayload {
  sub: string
  /** Seconds since the epoch, set by the signer: when the session began. */
  iat?: number
}

/** RNF-021: an HS256 secret short enough to guess forges any session. */
export const MIN_JWT_SECRET_LENGTH = 32
