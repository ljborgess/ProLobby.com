import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { SESSION_COOKIE_NAME } from './session-cookie'

/**
 * What the API says about this session, asked once per request: a small
 * authenticated read (the declared club). `null` when the API cannot be
 * reached — that is the page's own never-crash path, not a reason to leave.
 */
const sessionStatus = cache(async (): Promise<number | null> => {
  try {
    const response = await apiFetch('/api/accounts/me/club', {
      headers: { cookie: (await cookies()).toString() },
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(new Request('http://internal', { headers: await headers() })),
    })
    return response.status
  } catch {
    return null
  }
})

/**
 * The session gate of a signed-in area, run in the segment's layout (#296).
 * A `loading.tsx` starts streaming the page before the page itself runs, so a
 * `redirect()` made there would reach the browser after a 200 — for a missing
 * cookie and, worse, for an expired one the API refuses with 401. The layout
 * sits outside that boundary, so both stay the redirect the smoke test
 * checks. One extra, small request.
 *
 * Only a 401 leaves from here: it means the session itself is no good, for
 * every account. A 403 is the account's *state* (not yet verified, suspended,
 * terms pending) and this read is stricter than some pages about it — an
 * unverified account must still reach /verifications — so the page decides.
 * An unreachable API is the page's never-crash path too.
 */
export async function requireSession(): Promise<void> {
  if (!(await cookies()).get(SESSION_COOKIE_NAME)) {
    redirect('/login')
  }
  if ((await sessionStatus()) === 401) {
    redirect('/login')
  }
}
