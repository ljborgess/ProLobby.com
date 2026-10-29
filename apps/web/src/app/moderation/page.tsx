import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { SESSION_COOKIE_NAME } from '@/common/auth/session-cookie'
import { AppHeader } from '@/modules/account/app-header'
import { AccountBackdrop } from '@/modules/account/account-backdrop'
import { LoadErrorMessage } from '@/modules/account/load-error-message'
import { ModerationScreen } from '@/modules/moderation/moderation-screen'
import type { VerificationCase } from '@/modules/moderation/verification-queue'

export const metadata: Metadata = {
  title: 'Moderação — ProLobby',
}

/**
 * Character prints waiting for a moderator — issue #198. The API decides who
 * gets in: a 403 here only changes what the page says, never what it shows.
 */
export default async function ModerationPage() {
  const jar = await cookies()
  if (!jar.get(SESSION_COOKIE_NAME)) {
    redirect('/login')
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

  if (queue.status === 401) {
    redirect('/login')
  }

  const forbidden = queue.status === 403
  if (!forbidden && (!queue.ok || !options.ok)) {
    console.error(`moderation: API answered ${queue.status}, ${options.status}`)
    return <LoadError />
  }

  let cases: VerificationCase[] | 'forbidden' = 'forbidden'
  let archetypes: string[] = []
  let parsed = true
  if (!forbidden) {
    try {
      cases = (await queue.json()) as VerificationCase[]
      archetypes = ((await options.json()) as { archetype: string }[]).map((item) => item.archetype)
    } catch (error) {
      console.error('moderation: could not parse the API response', error)
      parsed = false
    }
  }
  if (!parsed) {
    return <LoadError />
  }

  return (
    <main className="relative flex min-h-svh flex-1 flex-col overflow-hidden px-4 py-8 sm:px-6">
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
