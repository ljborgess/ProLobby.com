/**
 * The session cookie's name, as the API sets it.
 *
 * `apps/web` never reads the cookie's *value* — it only forwards it and, on the
 * home, checks whether it exists at all before asking the API anything (issue
 * #171). The value is a JWT the API alone verifies (ADR-006).
 *
 * Kept in step with `SESSION_COOKIE_NAME` in `apps/api`. A rename there without
 * one here shows up as a signed-in person seeing the visitor's home.
 */
export const SESSION_COOKIE_NAME = 'prolobby_session'
