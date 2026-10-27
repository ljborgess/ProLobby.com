import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { BackAction } from '@/common/ui/back-action'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { AccountBackdrop } from '@/modules/account/account-backdrop'
import { ClubPanel, type DeclaredClubView } from '@/modules/account/club-panel'
import { LoadErrorMessage } from '@/modules/account/load-error-message'

export const metadata: Metadata = {
  title: 'Clube — ProLobby',
}

/**
 * The declared club — #229. Reads the account's own declaration, if any. An
 * unreachable API or a body it cannot use shows the load error, never a
 * crash, like /account/discord.
 */
export default async function ClubPage() {
  const cookie = (await cookies()).toString()

  let response: Response
  try {
    response = await apiFetch('/api/accounts/me/club', {
      headers: { cookie },
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(new Request('http://internal', { headers: await headers() })),
    })
  } catch {
    return <Screen>{<LoadErrorMessage />}</Screen>
  }

  if (response.status === 401 || response.status === 403) {
    redirect('/login')
  }
  if (!response.ok) {
    console.error(`account/club: API answered ${response.status}`)
    return <Screen>{<LoadErrorMessage />}</Screen>
  }

  let club: DeclaredClubView | null
  try {
    ;({ club } = (await response.json()) as { club: DeclaredClubView | null })
  } catch (error) {
    console.error('account/club: could not parse the API response', error)
    return <Screen>{<LoadErrorMessage />}</Screen>
  }

  return (
    <Screen>
      <ClubPanel initial={club ? { clubName: club.clubName, freeSlots: club.freeSlots } : null} />
    </Screen>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-svh flex-1 flex-col overflow-hidden px-4 py-8 sm:px-6">
      <AccountBackdrop />

      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <BackAction href="/verifications" label="ProLobby" />
        <LanguageSwitcher />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        {children}
      </div>
    </main>
  )
}
