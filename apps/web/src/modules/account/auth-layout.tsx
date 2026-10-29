'use client'

import Link from 'next/link'
import { Logo } from '@/common/ui/logo'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { useLandingContent } from '@/hooks/use-landing-content'
import { AuthArt, PitchGrid } from './auth-art'

/**
 * The frame every logged-out account screen sits in — issue #171,
 * 2026-09-22; forgot, reset and verify joined it on 2026-10-29, which is how
 * they got the language switch they were missing.
 *
 * Split down the middle: the form on the left, on a surface quiet enough to
 * fill in, and the drawn readout on the right. The panel is decoration and
 * nothing else, so it is `aria-hidden` and it disappears below `lg` — on a
 * phone the form is the whole screen, which is what someone signing in
 * actually wants. A wash of the accent stays behind the form there, so the
 * phone is not a bare black page.
 *
 * **One screen, no scroll.** The forms are short enough to fit, and a form
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
    <main className="auth-shell relative flex h-svh flex-1 overflow-hidden">
      <div
        aria-hidden
        className="landing-glow pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,_var(--color-accent-strong)_0%,_transparent_70%)] lg:hidden"
      />
      {/* The panel does not fit a phone, but its pitch does: a slice of it
          tilted away under the form, so the small screen is still the same
          place and not a bare black page. Faint, and gone from `lg` up, where
          the panel itself takes over. */}
      <div
        aria-hidden
        className="auth-pitch-band pointer-events-none absolute inset-x-0 bottom-0 h-56 [perspective:520px] lg:hidden"
      >
        <div className="absolute inset-0 origin-bottom [transform:rotateX(58deg)_scale(1.6)]">
          <PitchGrid />
        </div>
      </div>

      {/* A grid of `auto 1fr`, not a flex column.
       *
       * Three attempts at centring the form failed before this one: `flex-1`
       * on the child never grew inside a scroll container, `my-auto` had no
       * free space to split once the header row was in the flow, and `h-full`
       * measured 449px inside a 721px parent — a percentage height cannot
       * resolve against a parent whose own height came from `flex-1`, which
       * the engine treats as indefinite. So the height is stated outright, and
       * a `1fr` track takes whatever the header leaves. */}
      <div className="relative grid h-svh flex-1 grid-rows-[auto_1fr] overflow-y-auto px-4 py-5 sm:px-8 lg:px-14">
        {/* Logo and language share the top row. The switcher used to sit at
            the bottom, where it cost the form the last 40-odd pixels it
            needed to clear a short window without scrolling. */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="landing-focus font-display text-base font-semibold tracking-tight text-foreground"
          >
            <Logo />
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="grid min-h-0 place-items-center py-8">
          <div className="auth-enter flex w-full max-w-sm flex-col gap-7">{children}</div>
        </div>
      </div>

      <aside className="relative hidden border-l border-white/5 lg:flex lg:w-[46%] lg:flex-col lg:justify-end">
        <AuthArt />

        <div className="relative p-14">
          <div className="landing-rule mb-7 max-w-24" />
          <p className="max-w-sm text-balance font-display text-xl font-light leading-snug tracking-[-0.015em] text-foreground sm:text-2xl">
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

/**
 * The headline every auth screen opens with: Sora 300 at the headline size,
 * like the rest of the product, over the seam that draws in on arrival.
 */
export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="landing-section-title text-balance font-display text-foreground">{title}</h1>
      <div className="auth-seam" />
      {subtitle && (
        <p className="text-[0.95rem] leading-relaxed text-foreground-soft">{subtitle}</p>
      )}
    </div>
  )
}

type NoteTone = 'confirmed' | 'waiting' | 'error'

/**
 * A result under a form, with the mark the queue board uses for the same
 * idea: confirmed is a solid disc with a check that draws itself, waiting
 * (an e-mail on its way) is the dashed ring of a slot nobody has filled yet,
 * error is a ring in the error red. The mark is `aria-hidden`; the role and
 * the words stay on the paragraph, exactly as before.
 */
export function AuthNote({ tone, children }: { tone: NoteTone; children: React.ReactNode }) {
  return (
    <div className="auth-note flex items-start gap-3">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className={`mt-px size-6 shrink-0 ${tone === 'error' ? 'text-danger' : 'text-accent'}`}
      >
        {tone === 'confirmed' && (
          <>
            <circle cx="12" cy="12" r="11" fill="currentColor" />
            <path
              className="auth-mark-check"
              d="M7.5 12.5l3 3 6-6.5"
              pathLength={1}
              fill="none"
              stroke="var(--color-bg)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        {tone === 'waiting' && (
          <circle
            className="landing-slot-wait origin-center [transform-box:fill-box]"
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 2.6"
          />
        )}
        {tone === 'error' && (
          <>
            <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 7v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="1.1" fill="currentColor" />
          </>
        )}
      </svg>
      {children}
    </div>
  )
}
