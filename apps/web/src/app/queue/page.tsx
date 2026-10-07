import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { SESSION_COOKIE_NAME } from '@/common/auth/session-cookie'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { ProLobbyEmblem } from '@/common/ui/pro-lobby-emblem'
import type { CharacterCategory } from '@/content/character'
import type { MovementBand } from '@/content/queue'
import { AccountBackdrop } from '@/modules/account/account-backdrop'
import { LoadErrorMessage } from '@/modules/account/load-error-message'
import type { QueuePrerequisites } from '@/modules/account/queue-prerequisites-panel'
import type { CharacterView } from '@/modules/character/types'
import { QueueScreen, type QueueState } from '@/modules/queue/queue-screen'

export const metadata: Metadata = {
  title: 'Fila — ProLobby',
}

/**
 * The queue — issue #233. Same session gate and never-crash fallback as
 * /account/character.
 */
export default async function QueuePage() {
  const jar = await cookies()
  if (!jar.get(SESSION_COOKIE_NAME)) {
    redirect('/login')
  }

  const init = {
    headers: { cookie: jar.toString() },
    cache: 'no-store' as const,
    forwardedIp: forwardedIpFrom(new Request('http://internal', { headers: await headers() })),
  }

  let responses: Response[]
  try {
    responses = await Promise.all([
      apiFetch('/api/queue', init),
      apiFetch('/api/characters', init),
      apiFetch('/api/queue/movement', init),
      apiFetch('/api/accounts/me/queue-prerequisites', init),
    ])
  } catch {
    return <LoadError />
  }

  if (responses.some((response) => response.status === 401 || response.status === 403)) {
    redirect('/login')
  }
  if (responses.some((response) => !response.ok)) {
    console.error(`queue: API answered ${responses.map((r) => r.status).join(', ')}`)
    return <LoadError />
  }

  let queue: QueueState
  let characters: CharacterView[]
  let movement: Record<CharacterCategory, MovementBand>
  let prerequisites: QueuePrerequisites
  try {
    ;[queue, characters, movement, prerequisites] = (await Promise.all(
      responses.map((response) => response.json()),
    )) as [QueueState, CharacterView[], Record<CharacterCategory, MovementBand>, QueuePrerequisites]
  } catch (error) {
    console.error('queue: could not parse the API response', error)
    return <LoadError />
  }

  return (
    <main className="relative flex min-h-svh flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
      <AccountBackdrop />
      {/* The emblem as a watermark: huge, faint, behind the whole walk. */}
      <ProLobbyEmblem className="pointer-events-none absolute left-1/2 top-1/2 w-[min(110vw,58rem)] -translate-x-1/2 -translate-y-1/2 text-white/[0.035]" />
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-end gap-4">
        <LanguageSwitcher />
      </div>
      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center py-2">
        <QueueScreen
          initial={queue}
          characters={characters}
          movement={movement}
          reputation={prerequisites.reputation}
          reputationBand={prerequisites.reputationBand}
        />
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
