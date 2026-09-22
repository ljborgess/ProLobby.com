'use client'

import Link from 'next/link'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { useLandingContent } from '@/hooks/use-landing-content'
import { AuthArt } from './auth-art'

/**
 * The frame both auth screens sit in — issue #171, 2026-09-22.
 *
 * Split down the middle: the form on the left, on a surface quiet enough to
 * fill in, and the drawn readout on the right. The panel is decoration and
 * nothing else, so it is `aria-hidden` and it disappears below `lg` — on a
 * phone the form is the whole screen, which is what someone signing in
 * actually wants.
 *
 * **One screen, no scroll.** Both forms are short enough to fit, and a form
 * that fits is a form someone finishes: nothing below the fold means no field
 * to discover and no submit button to hunt for. That is why the column is
 * `h-svh` with its own `overflow-y-auto` rather than letting the page grow —
 * on a short window the form scrolls inside its own column and the art stays
 * put, instead of the whole page sliding and taking the panel with it.
 *
 * Client, so the panel's copy follows the language switch without a
 * navigation — the same reason `LandingView` is.
 */
export function AuthLayout({
  children,
  variant,
}: {
  children: React.ReactNode
  variant: 'signIn' | 'signUp'
}) {
  const aside = useLandingContent().authAside[variant]

  return (
    <main className="flex h-svh flex-1 overflow-hidden">
      {/* A grid of `auto 1fr`, not a flex column.
       *
       * Three attempts at centring the form failed before this one: `flex-1`
       * on the child never grew inside a scroll container, `my-auto` had no
       * free space to split once the header row was in the flow, and `h-full`
       * measured 449px inside a 721px parent — a percentage height cannot
       * resolve against a parent whose own height came from `flex-1`, which
       * the engine treats as indefinite. So the height is stated outright, and
       * a `1fr` track takes whatever the header leaves. */}
      <div className="grid h-svh flex-1 grid-rows-[auto_1fr] overflow-y-auto px-4 py-5 sm:px-8 lg:px-14">
        {/* Logo and language share the top row. The switcher used to sit at
            the bottom, where it cost the form the last 40-odd pixels it
            needed to clear a short window without scrolling. */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="landing-focus font-display text-base font-semibold tracking-tight text-foreground"
          >
            Pro<span className="text-accent">Lobby</span>
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="grid min-h-0 place-items-center py-8">
          <div className="flex w-full max-w-sm flex-col gap-4">{children}</div>
        </div>
      </div>

      <aside className="relative hidden border-l border-white/5 lg:flex lg:w-[46%] lg:flex-col lg:justify-end">
        <AuthArt />

        <div className="relative p-14">
          <div className="landing-rule mb-7 max-w-24" />
          <p className="landing-section-title max-w-sm font-display text-foreground">
            {aside.title}
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-foreground-soft/85">
            {aside.body}
          </p>
        </div>
      </aside>
    </main>
  )
}
