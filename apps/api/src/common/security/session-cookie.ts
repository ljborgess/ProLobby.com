import type { CookieOptions } from 'express'

/** The single name the session cookie is written and read by. */
export const SESSION_COOKIE_NAME = 'prolobby_session'

/**
 * Options for the session cookie — item 9 of the security checklist.
 *
 * Centralised so that "set the cookie" and "clear the cookie" cannot drift:
 * clearing with different options silently fails to clear, and the session
 * survives a logout the user believes worked.
 *
 * @param maxAgeMs how long the cookie lives; must match the JWT expiry, or one
 *                 of the two outlives the other for no reason.
 */
export function sessionCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    // JavaScript cannot read it — an XSS gets to act as the user, but cannot
    // walk away with the token.
    httpOnly: true,
    // HTTPS only. Off in development because localhost is plain HTTP, and a
    // Secure cookie there is simply never stored, which looks like a broken
    // login rather than a misconfiguration.
    secure: process.env.NODE_ENV === 'production',
    // 'lax' and not 'strict': 'strict' would drop the cookie when the user
    // arrives from an external link (a Discord message, which is the normal
    // path into this product) and they would land logged out.
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  }
}
