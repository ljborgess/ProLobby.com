import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { DiscordLinkPanel } from '@/modules/account/discord-link-panel'
import { isDiscordLinkStatus } from '@/modules/account/discord-link-status'

export const metadata: Metadata = {
  title: 'Discord — ProLobby',
}

export default async function DiscordPage({ searchParams }: PageProps<'/account/discord'>) {
  const cookie = (await cookies()).toString()
  const response = await apiFetch('/api/accounts/me/discord-link', {
    headers: { cookie },
    cache: 'no-store',
    forwardedIp: forwardedIpFrom(new Request('http://internal', { headers: await headers() })),
  })

  // No session, or one the API will not serve: the login screen is the only
  // place that fixes it. Any other failure is a real error, not a state to guess.
  if (response.status === 401 || response.status === 403) {
    redirect('/login')
  }
  if (!response.ok) {
    throw new Error('could not read the Discord link state')
  }

  const { linked } = (await response.json()) as { linked: boolean }
  const raw = (await searchParams).status
  const status = typeof raw === 'string' && isDiscordLinkStatus(raw) ? raw : undefined

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12 sm:px-6">
      <DiscordLinkPanel linked={linked} status={status} />
      <LanguageSwitcher />
    </main>
  )
}
