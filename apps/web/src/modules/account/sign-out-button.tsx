'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContent } from '@/hooks/use-auth-content'

/**
 * Sign out — the way out of a session, missing until 2026-09-22.
 *
 * Until this existed the only way to drop a session was to clear the cookie
 * by hand: it is `HttpOnly` (ADR-006), so no script, not even ours, can
 * remove it. Only the API can, by answering with an expired `Set-Cookie`,
 * which is what `DELETE /bff/sessions` relays.
 *
 * `router.refresh()` after the push matters: without it the App Router can
 * serve the signed-in render of the page we just left from its client cache,
 * so the person appears to still be logged in until a hard reload.
 */
export function SignOutButton() {
  const content = useAuthContent().signOut
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleClick() {
    setSigningOut(true)
    try {
      await fetch('/bff/sessions', { method: 'DELETE' })
    } catch {
      // The cookie may well be gone anyway, and a stuck button is worse than
      // a redirect that lands back on /login: let the navigation decide.
    }
    router.push('/')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={signingOut}
      className="text-sm text-foreground-soft underline disabled:opacity-60"
    >
      {signingOut ? content.submitting : content.submit}
    </button>
  )
}
