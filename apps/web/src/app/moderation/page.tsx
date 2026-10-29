import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { SESSION_COOKIE_NAME } from '@/common/auth/session-cookie'
import { AppHeader } from '@/modules/account/app-header'
import { AccountBackdrop } from '@/modules/account/account-backdrop'
import { LoadErrorMessage } from '@/modules/account/load-error-message'
import { ModerationScreen } from '@/modules/moderation/moderation-screen'
import type { VerificationCase } from '@/modules/moderation/verification-queue'

// No route name in the tab: the area does not say what it is to anyone.
export const metadata: Metadata = {
  title: 'ProLobby',
}

/**
 * Character prints waiting for a moderator — issue #198. The API decides who
 * gets in; this page only hides that the door exists (2026-10-29): without a
 * session, or without the role, the answer is the same 404 as a route that
 * was never there, not a login redirect or an "only for moderation" notice.
 */
export default async function ModerationPage() {
  const jar = await cookies()
  if (!jar.get(SESSION_COOKIE_NAME)) {
    notFound()
  }

  const init = {
    headers: { cookie: jar.toString() },
    cache: 'no-store' as const,
    forwardedIp: forwardedIpFrom(new Request('http://internal', { headers: await headers() })),
  }

  let queue: Response
  let options: Response
  try {
    ;[queue, options] = await Promise.all([
      apiFetch('/api/moderation/character-verifications', init),
      apiFetch('/api/characters/archetypes', init),
    ])
  } catch {
    return <LoadError />
  }

  if (queue.status === 401 || queue.status === 403) {
    notFound()
  }

  if (!queue.ok || !options.ok) {
    console.error(`moderation: API answered ${queue.status}, ${options.status}`)
    return <LoadError />
  }

  let cases: VerificationCase[]
  let archetypes: string[]
  try {
    cases = (await queue.json()) as VerificationCase[]
    archetypes = ((await options.json()) as { archetype: string }[]).map((item) => item.archetype)
  } catch (error) {
    console.error('moderation: could not parse the API response', error)
    return <LoadError />
  }

  return (
    <main className="relative flex min-h-svh flex-1 flex-col overflow-x-clip px-4 py-8 sm:px-6">
      <AccountBackdrop />
      <AppHeader />
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col py-10">
        <ModerationScreen cases={cases} archetypes={archetypes} />
      </div>
    </main>
  )
}

function LoadError() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:px-6">
      <LoadErrorMessage />
    </main>
  )
}
