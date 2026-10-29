import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AccountBackdrop } from '@/modules/account/account-backdrop'
import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { AppHeader } from '@/modules/account/app-header'
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
    // A real error is still logged, not just swallowed into "unavailable" — the
    // audit that rewrote this to never crash the page should not also make a
    // genuine backend bug invisible. 503 is excluded: it is the documented
    // signal for "Discord not configured in this environment" elsewhere in the
    // flow (discord-link-panel.tsx), not a bug.
    if (response.status !== 503) {
      console.error(`account/discord: API answered ${response.status}`)
    }
    return <Screen linked={false} status="unavailable" />
  }

  let linked: boolean
  try {
    ;({ linked } = (await response.json()) as { linked: boolean })
  } catch (error) {
    // 200 with an empty or malformed body (proxy hiccup, already-consumed
    // stream) — same fallback as any other unreachable-API case, not a crash.
    console.error('account/discord: could not parse the API response', error)
    return <Screen linked={false} status="unavailable" />
  }

  const raw = (await searchParams).status
  const status = typeof raw === 'string' && isDiscordLinkStatus(raw) ? raw : undefined

  return <Screen linked={linked} status={status} />
}

function Screen({ linked, status }: { linked: boolean; status?: DiscordLinkStatus }) {
  return (
    <main className="relative flex min-h-svh flex-1 flex-col overflow-x-clip px-4 py-8 sm:px-6">
      <AccountBackdrop />

      <AppHeader />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <DiscordLinkPanel linked={linked} status={status} />
      </div>
    </main>
  )
}
