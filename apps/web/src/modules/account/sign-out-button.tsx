'use client'

import { type ReactNode, useState } from 'react'
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

  // A row of the account menu, with its words: an icon alone at the top of
  // every screen was too easy to hit and too hard to read (2026-10-29).
  // The leaving mark steps out of its ring on hover, the way the door opens.
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={signingOut}
        aria-busy={signingOut || undefined}
        className="menu-row landing-focus group flex min-h-11 w-full items-center gap-3 rounded-sm px-1.5 text-left text-sm text-foreground-soft transition-colors hover:bg-white/[0.05] hover:text-foreground disabled:cursor-progress disabled:opacity-60"
      >
        <MenuRing>
          <SignOutMark className="sign-out-mark size-4 shrink-0" />
        </MenuRing>
        {signingOut ? content.submitting : content.submit}
      </button>
      {/* The failure is announced, not just drawn: someone who believes they
          signed out and did not needs to be told, and a screen reader user
          gets nothing from a button that simply stayed put. */}
      {failed && (
        <p role="alert" className="px-3 pb-2 text-xs leading-snug text-danger">
          {content.failed}
        </p>
      )}
    </div>
  )
}

/**
 * The hairline ring every row of the account menu leads with: the same 32px
 * shape as `BackAction`, because both are ways out of where you are.
 */
export function MenuRing({ children }: { children: ReactNode }) {
  return (
    <span className="menu-ring flex size-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] transition-colors duration-200">
      {children}
    </span>
  )
}
