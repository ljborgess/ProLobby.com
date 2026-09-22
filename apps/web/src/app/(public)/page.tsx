import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE_NAME } from '@/common/auth/session-cookie'

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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">ProLobby</h1>
      <p className="text-lg text-foreground-soft">
        Matchmaking competitivo e identidade verificada para EA FC Pro Clubs.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/sign-up"
          className="rounded-sm bg-accent px-6 py-3 text-base font-medium text-background"
        >
          Criar conta
        </Link>
        <Link
          href="/login"
          className="rounded-sm border border-white/10 px-6 py-3 text-base font-medium text-foreground"
        >
          Entrar
        </Link>
      </div>
    </main>
  )
}
