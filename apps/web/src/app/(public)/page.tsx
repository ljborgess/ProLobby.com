import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
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
 * A signed-in visitor who still lands here (a bookmark, a shared link) is sent
 * on immediately — this page never renders the landing to someone with a
 * session, which would be a "Criar conta" button for an account that exists.
 * Checking the cookie costs no API call, only a redirect.
 */
export default async function Home() {
  if ((await cookies()).get(SESSION_COOKIE_NAME)) {
    redirect('/verifications')
  }

  return (
    <main className="landing-page flex w-full flex-1 flex-col">
      <LandingView />
    </main>
  )
}
