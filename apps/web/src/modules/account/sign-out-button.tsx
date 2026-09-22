'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignOutMark } from '@/common/ui/icons'
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

  // Icon only, so the label has to live somewhere a screen reader reaches:
  // `aria-label` carries it, `title` shows it on hover for everyone else. The
  // button keeps a 40px box, which is the smallest comfortable pointer target.
  const label = signingOut ? content.submitting : content.submit

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={signingOut}
      aria-label={label}
      title={label}
      className="landing-focus flex size-10 items-center justify-center rounded-full border border-white/15 text-foreground-soft transition-colors hover:border-white/35 hover:text-foreground disabled:opacity-60"
    >
      <SignOutMark className="size-[18px]" />
    </button>
  )
}
