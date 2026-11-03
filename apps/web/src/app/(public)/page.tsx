import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME } from '@/common/auth/session-cookie'
import { LandingView } from '@/modules/landing/landing-view'

/**
 * The public landing — always the same page, whether the visitor is anonymous
 * or not.
 *
 * Before the routing change of 2026-09-22, this page carried a second job: a
 * signed-in visitor saw the queue-prerequisites panel here instead of the
 * landing. That put a dashboard behind the same URL as the marketing page —
 * confusing to reason about, and awkward the moment this page needs anything
 * else public (pricing, rules, whatever comes next). The signed-in area now
 * lives at /verifications, and login sends people there directly.
 *
 * A signed-in visitor sees it too (2026-10-29: the logo is the way home, and
 * it went nowhere while this page bounced sessions to /verifications). The
 * top bar then offers the account instead of "Criar conta" for an account
 * that already exists. Reading the cookie costs no API call.
 */
export default async function Home() {
  const signedIn = Boolean((await cookies()).get(SESSION_COOKIE_NAME))

  return (
    <main className="landing-page flex w-full flex-1 flex-col">
      <LandingView signedIn={signedIn} />
    </main>
  )
}
