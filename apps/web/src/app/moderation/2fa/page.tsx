import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { SESSION_COOKIE_NAME } from '@/common/auth/session-cookie'
import { AccountBackdrop } from '@/modules/account/account-backdrop'
import { AppHeader } from '@/modules/account/app-header'
import { TwoFactorScreen } from '@/modules/moderation/two-factor-screen'

export const metadata: Metadata = {
  title: 'ProLobby',
}

/**
 * The door to the panel's second factor — #311. Like `/moderation`, it does
 * not exist for anyone the factor is not required of: no session, or no
 * panel role, answers the same 404.
 */
export default async function TwoFactorPage() {
  const jar = await cookies()
  if (!jar.get(SESSION_COOKIE_NAME)) notFound()

  let response: Response
  try {
    response = await apiFetch('/api/accounts/me/two-factor', {
      headers: { cookie: jar.toString() },
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(new Request('http://internal', { headers: await headers() })),
    })
  } catch {
    notFound()
  }
  if (!response.ok) notFound()
  const status = (await response.json()) as {
    required: boolean
    enabled: boolean
    verified: boolean
  }

  if (!status.required) notFound()
  if (status.verified) redirect('/moderation')

  return (
    <main className="relative flex min-h-svh flex-1 flex-col overflow-x-clip px-4 py-8 sm:px-6">
      <AccountBackdrop />
      <AppHeader />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col py-10">
        <TwoFactorScreen enabled={status.enabled} />
      </div>
    </main>
  )
}
