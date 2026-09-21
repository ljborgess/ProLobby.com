import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { SESSION_COOKIE_NAME } from '@/common/auth/session-cookie'
import {
  QueuePrerequisitesPanel,
  type QueuePrerequisites,
} from '@/modules/account/queue-prerequisites-panel'

/**
 * The home — public for a visitor, and the place a signed-in person finds out
 * what is still missing (issue #171).
 *
 * Before #171 the Discord screen was reachable only by typing its URL: nothing
 * linked to it, and the queue refusal that RF-002 designed as the discovery
 * path is phase 2.5. This panel is that path until then.
 *
 * With no session cookie the API is never called, so a visitor still gets a
 * page that costs nothing and says the same as before.
 *
 * Reading the cookie makes this page dynamic, and Next answers it with
 * `no-cache, must-revalidate` — which is what keeps a signed-in render out of
 * the shared cache in front of it (ADR-009 section 8). Setting the header in
 * middleware does not work: the render overrides it.
 */
export default async function Home() {
  const prerequisites = await readPrerequisites()

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">ProLobby</h1>
      <p className="text-lg text-foreground-soft">
        Matchmaking competitivo e identidade verificada para EA FC Pro Clubs.
      </p>

      {prerequisites ? (
        <div className="w-full max-w-md text-left">
          <QueuePrerequisitesPanel {...prerequisites} />
        </div>
      ) : (
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
      )}
    </main>
  )
}

/**
 * The prerequisites of whoever is signed in, or `null` when there is nobody to
 * ask about.
 *
 * `null` covers every refusal on purpose: no cookie, an expired session, a
 * suspended or banned account, terms not accepted, or the API being down. All
 * of them land on the visitor's home, which promises nothing — inventing a
 * punishment or terms screen here would be a different slice, and the page must
 * not break because the API is unreachable.
 */
async function readPrerequisites(): Promise<QueuePrerequisites | null> {
  const jar = await cookies()

  if (!jar.get(SESSION_COOKIE_NAME)) {
    return null
  }

  try {
    const response = await apiFetch('/api/accounts/me/queue-prerequisites', {
      headers: { cookie: jar.toString() },
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(new Request('http://internal', { headers: await headers() })),
    })

    return response.ok ? ((await response.json()) as QueuePrerequisites) : null
  } catch {
    return null
  }
}
