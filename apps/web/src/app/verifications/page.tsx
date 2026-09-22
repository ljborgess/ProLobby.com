import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { SESSION_COOKIE_NAME } from '@/common/auth/session-cookie'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { AccountBackdrop } from '@/modules/account/account-backdrop'
import { LoadErrorMessage } from '@/modules/account/load-error-message'
import {
  QueuePrerequisitesPanel,
  type QueuePrerequisites,
} from '@/modules/account/queue-prerequisites-panel'
import { SignOutButton } from '@/modules/account/sign-out-button'

export const metadata: Metadata = {
  title: 'Sua conta — ProLobby',
}

/**
 * Where login lands — issue #171, moved off the home in the routing change of
 * 2026-09-22 (the home had been carrying both jobs: public landing and
 * authenticated dashboard, on the same URL).
 *
 * Session-gated: no cookie at all skips the API call entirely and goes
 * straight to /login, the same as an expired one does after asking.
 */
export default async function VerificationsPage() {
  const jar = await cookies()

  if (!jar.get(SESSION_COOKIE_NAME)) {
    redirect('/login')
  }

  const cookie = jar.toString()

  let response: Response
  try {
    response = await apiFetch('/api/accounts/me/queue-prerequisites', {
      headers: { cookie },
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(new Request('http://internal', { headers: await headers() })),
    })
  } catch {
    return <LoadError />
  }

  // Expired session, or a state the API refuses (suspended, banned, terms
  // pending): the login screen is the only place that fixes it. Inventing a
  // punishment or terms screen here would be a different slice (see #160).
  if (response.status === 401 || response.status === 403) {
    redirect('/login')
  }

  if (!response.ok) {
    console.error(`verifications: API answered ${response.status}`)
    return <LoadError />
  }

  let prerequisites: QueuePrerequisites
  try {
    prerequisites = (await response.json()) as QueuePrerequisites
  } catch (error) {
    console.error('verifications: could not parse the API response', error)
    return <LoadError />
  }

  return (
    <main className="relative flex min-h-svh flex-1 flex-col overflow-hidden px-4 py-8 sm:px-6">
      <AccountBackdrop />

      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <span className="font-display text-base font-semibold tracking-tight text-foreground">
          Pro<span className="text-accent">Lobby</span>
        </span>
        {/* The switcher belongs here too: this was the one screen without it,
            and it is where someone lands after login — so a person who picked
            Spanish had no way back on the very page they spend time on. */}
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <SignOutButton />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <QueuePrerequisitesPanel {...prerequisites} />
      </div>
    </main>
  )
}

/**
 * The API is unreachable or answered something this page cannot use. Never a
 * crash: the audit of 2026-09-21 established that pattern for /account/discord,
 * and this page follows it — same reasoning, one door further up the flow.
 */
function LoadError() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:px-6">
      <LoadErrorMessage />
    </main>
  )
}
