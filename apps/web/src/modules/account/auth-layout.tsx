'use client'

import Link from 'next/link'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { useLandingContent } from '@/hooks/use-landing-content'

/**
 * The frame both auth screens sit in — issue #171, 2026-09-22.
 *
 * Split down the middle: the form on the left, on a surface quiet enough to
 * fill in, and a panel of moving art on the right. The panel is decoration and
 * nothing else, so it is `aria-hidden` and it disappears below `lg` — on a
 * phone the form is the whole screen, which is what someone signing in
 * actually wants.
 *
 * The art reuses the landing's drawn layers (glow, perspective floor, woven
 * texture) rather than an image, for the same reason the landing does: game
 * art belongs to EA and we ship none of it.
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
    <main className="flex min-h-svh flex-1 flex-col lg:flex-row">
      <div className="flex flex-1 flex-col px-4 py-10 sm:px-8 lg:px-14">
        <Link
          href="/"
          className="landing-focus self-start font-display text-lg font-semibold tracking-tight text-foreground"
        >
          Pro<span className="text-accent">Lobby</span>
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-7 py-10">
          {children}
        </div>

        <div className="mx-auto w-full max-w-sm">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Sticky and exactly one screen tall: the sign-up form is long enough
          to scroll, and a panel that scrolls with it drags its own copy off
          the bottom of the screen before anyone reads it. */}
      <aside
        aria-hidden
        className="relative hidden overflow-hidden border-l border-white/5 lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-[46%] lg:flex-col lg:justify-end"
      >
        <div className="absolute inset-0 -z-10">
          <div className="landing-glow absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_60%_15%,_var(--color-accent-strong)_0%,_transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_20%_70%,_var(--color-gold)_0%,_transparent_70%)] opacity-[0.08]" />
          <div className="landing-floor absolute inset-x-0 bottom-0 h-80 opacity-45" />
          <div className="landing-weave absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_45%,_transparent_0%,_var(--color-bg)_100%)]" />
          <div className="absolute inset-0 bg-background/35" />
        </div>

        <div className="p-14">
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
