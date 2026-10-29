import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { SESSION_COOKIE_NAME } from '@/common/auth/session-cookie'
import { AppHeader } from '@/modules/account/app-header'
import { AccountBackdrop } from '@/modules/account/account-backdrop'
import { LoadErrorMessage } from '@/modules/account/load-error-message'
import { CharacterScreen } from '@/modules/character/character-screen'
import type { ArchetypeOption, CharacterView } from '@/modules/character/types'

export const metadata: Metadata = {
  title: 'Elenco — ProLobby',
}

/**
 * Create a character and send its verification print — issue #196. Same
 * session gate and never-crash fallback as /verifications.
 */
export default async function CharacterPage() {
  const jar = await cookies()
  if (!jar.get(SESSION_COOKIE_NAME)) {
    redirect('/login')
  }

  const init = {
    headers: { cookie: jar.toString() },
    cache: 'no-store' as const,
    forwardedIp: forwardedIpFrom(new Request('http://internal', { headers: await headers() })),
  }

  let responses: [Response, Response]
  try {
    responses = await Promise.all([
      apiFetch('/api/characters', init),
      apiFetch('/api/characters/archetypes', init),
    ])
  } catch {
    return <LoadError />
  }

  if (responses.some((response) => response.status === 401 || response.status === 403)) {
    redirect('/login')
  }
  if (responses.some((response) => !response.ok)) {
    console.error(`account/character: API answered ${responses.map((r) => r.status).join(', ')}`)
    return <LoadError />
  }

  let characters: CharacterView[]
  let archetypes: ArchetypeOption[]
  try {
    characters = (await responses[0].json()) as CharacterView[]
    archetypes = (await responses[1].json()) as ArchetypeOption[]
  } catch (error) {
    console.error('account/character: could not parse the API response', error)
    return <LoadError />
  }

  return (
    <main className="relative flex min-h-svh flex-1 flex-col overflow-x-clip px-4 py-8 sm:px-6">
      <AccountBackdrop />
      <AppHeader />
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col py-6 sm:py-10">
        <CharacterScreen characters={characters} archetypes={archetypes} />
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
