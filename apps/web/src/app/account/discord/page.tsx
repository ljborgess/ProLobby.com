import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { DiscordLinkPanel } from '@/modules/account/discord-link-panel'
import { isDiscordLinkStatus, type DiscordLinkStatus } from '@/modules/account/discord-link-status'

export const metadata: Metadata = {
  title: 'Discord — ProLobby',
}

export default async function DiscordPage({ searchParams }: PageProps<'/account/discord'>) {
  const cookie = (await cookies()).toString()

  let response: Response
  try {
    response = await apiFetch('/api/accounts/me/discord-link', {
      headers: { cookie },
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(new Request('http://internal', { headers: await headers() })),
    })
  } catch {
    // The API is unreachable. Crashing the page would tell the person their
    // account is broken, when what is broken is a hop they cannot see — so the
    // screen loads and says the link is unavailable right now, which is true
    // and is the same message a 503 from the API produces.
    return <Screen linked={false} status="unavailable" />
  }

  // No session, or one the API will not serve: the login screen is the only
  // place that fixes it.
  if (response.status === 401 || response.status === 403) {
    redirect('/login')
  }

  if (!response.ok) {
    return <Screen linked={false} status="unavailable" />
  }

  const { linked } = (await response.json()) as { linked: boolean }
  const raw = (await searchParams).status
  const status = typeof raw === 'string' && isDiscordLinkStatus(raw) ? raw : undefined

  return <Screen linked={linked} status={status} />
}

function Screen({ linked, status }: { linked: boolean; status?: DiscordLinkStatus }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12 sm:px-6">
      <DiscordLinkPanel linked={linked} status={status} />
      <LanguageSwitcher />
    </main>
  )
}
