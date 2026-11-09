import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE_NAME } from './session-cookie'

/**
 * The session gate of a signed-in area, run in the segment's layout (#296).
 * A `loading.tsx` starts streaming the page before the page itself runs, so a
 * `redirect()` made there would reach the browser after a 200. The layout sits
 * outside that boundary: without a session the answer is still the redirect
 * the smoke test checks, before any byte of the page.
 */
export async function requireSession(): Promise<void> {
  if (!(await cookies()).get(SESSION_COOKIE_NAME)) {
    redirect('/login')
  }
}
