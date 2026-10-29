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
  const [failed, setFailed] = useState(false)

  async function handleClick() {
    setSigningOut(true)
    setFailed(false)

    // Only the API can end the session: the cookie is `HttpOnly`, so leaving
    // without its blessing leaves the person signed in while the screen says
    // otherwise — the worst possible lie to tell on a shared machine. `fetch`
    // resolves on 5xx, so the status has to be read; `relay()` answers 502
    // when the API is unreachable, and the cookie survives that.
    let response: Response
    try {
      response = await fetch('/bff/sessions', { method: 'DELETE' })
    } catch {
      setSigningOut(false)
      setFailed(true)
      return
    }

    if (!response.ok) {
      setSigningOut(false)
      setFailed(true)
      return
    }

    router.push('/')
    router.refresh()
  }

  // Icon only, so the label has to live somewhere a screen reader reaches:
  // `aria-label` carries it, `title` shows it on hover for everyone else. The
  // button keeps a 44px box, the comfortable touch target.
  const label = signingOut ? content.submitting : content.submit

  return (
    <div className="flex items-center gap-3">
      {/* The failure is announced, not just drawn: someone who believes they
          signed out and did not needs to be told, and a screen reader user
          gets nothing from a button that simply stayed put. */}
      {failed && (
        <p role="alert" className="text-xs text-danger">
          {content.failed}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={signingOut}
        aria-label={label}
        title={label}
        className="landing-focus flex size-11 items-center justify-center rounded-full border border-white/30 text-foreground-soft transition-colors hover:border-white/35 hover:text-foreground disabled:opacity-60"
      >
        <SignOutMark className="size-[18px]" />
      </button>
    </div>
  )
}
