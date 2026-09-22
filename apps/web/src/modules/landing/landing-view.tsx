'use client'

import Link from 'next/link'
import { useLandingContent } from '@/hooks/use-landing-content'
import { LanguageSwitcher } from '@/common/ui/language-switcher'

const FEATURE_ICONS = [
  // shield — identidade verificada
  <path key="shield" d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />,
  // queue — fila por posição
  <path key="queue" d="M4 6h16M4 12h16M4 18h10" />,
  // link — vínculo com Discord
  <path key="link" d="M9 15l6-6M9 9h6v6" />,
]

/**
 * The public landing's visual body — issue #171 redesign of 2026-09-22,
 * extended the same day with a top bar, a facts strip, a position grid and a
 * solo-queue spotlight (docs/produto/01-visao/01-visao.md, "A landing
 * pública sai do gatilho acima"). Structure across both passes is informed
 * by gamersclub.com.br at the user's request; colors and type stay the
 * inherited design system — no new palette, and no invented traction number
 * (no queue yet in Fase 2.3 — `facts` below holds only already-decided spec
 * numbers, never a made-up "jogadores online").
 *
 * Client component, like SignUpHeading, so the language switch re-renders
 * this copy without a navigation.
 */
export function LandingView() {
  const content = useLandingContent()

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-background/80 px-4 py-4 backdrop-blur sm:px-6">
        <span className="font-display text-lg font-semibold text-foreground">ProLobby</span>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-foreground-soft">
            {content.topBar.signIn}
          </Link>
          <Link
            href="/sign-up"
            className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-background transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {content.topBar.cta}
          </Link>
        </nav>
      </header>

      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-24 text-center sm:px-6">
        <div
          aria-hidden
          className="landing-glow pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--color-accent-strong)_0%,_transparent_60%)]"
        />
        <h1
          className="landing-fade-up max-w-3xl font-display text-4xl font-semibold text-foreground sm:text-5xl"
          style={{ '--landing-delay': '0.05s' } as React.CSSProperties}
        >
          {content.hero.titlePrefix}
          <span className="text-accent">{content.hero.titleAccent}</span>
          {content.hero.titleSuffix}
        </h1>
        <p
          className="landing-fade-up mt-6 max-w-xl text-lg text-foreground-soft"
          style={{ '--landing-delay': '0.15s' } as React.CSSProperties}
        >
          {content.hero.subtitle}
        </p>
        <div
          className="landing-fade-up mt-8 flex flex-col gap-3 sm:flex-row"
          style={{ '--landing-delay': '0.25s' } as React.CSSProperties}
        >
          <Link
            href="/sign-up"
            className="rounded-sm bg-accent px-6 py-3 text-base font-medium text-background transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {content.hero.primaryCta}
          </Link>
          <Link
            href="/login"
            className="rounded-sm border border-white/10 px-6 py-3 text-base font-medium text-foreground transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {content.hero.secondaryCta}
          </Link>
        </div>
      </section>

      <section className="border-t border-white/5 px-4 py-16 sm:px-6">
        <p className="text-center text-sm font-medium uppercase tracking-wide text-accent">
          {content.facts.eyebrow}
        </p>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4">
          {content.facts.items.map((fact) => (
            <div key={fact.label} className="landing-reveal flex flex-col items-center text-center">
              <span className="font-display text-3xl font-semibold text-accent sm:text-4xl">
                {fact.value}
              </span>
              <span className="mt-1 text-sm text-foreground-soft">{fact.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/5 bg-surface px-4 py-16 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center sm:flex-row sm:gap-12 sm:text-left">
          <div className="flex-1">
            <p className="text-sm font-medium uppercase tracking-wide text-accent">
              {content.positions.eyebrow}
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
              {content.positions.title}
            </h2>
            <p className="mt-3 text-sm text-foreground-soft">{content.positions.body}</p>
          </div>
          <div className="landing-reveal flex flex-1 flex-wrap justify-center gap-3 sm:justify-end">
            {content.positions.items.map((position) => (
              <span
                key={position}
                className="rounded-sm border border-white/10 bg-surface-weak px-4 py-2 text-sm font-medium text-foreground"
              >
                {position}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 px-4 py-16 sm:px-6">
        <div className="landing-reveal mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">
            {content.soloQueue.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
            {content.soloQueue.title}
          </h2>
          <p className="mt-3 text-sm text-foreground-soft">{content.soloQueue.body}</p>
        </div>
      </section>

      <section className="border-t border-white/5 bg-surface px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-sm font-medium uppercase tracking-wide text-accent">
            {content.features.eyebrow}
          </p>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {content.features.items.map((item, index) => (
              <div
                key={item.title}
                className="landing-reveal flex flex-col items-center gap-3 text-center"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="size-10 text-accent"
                >
                  {FEATURE_ICONS[index]}
                </svg>
                <h2 className="font-display text-lg font-semibold text-foreground">{item.title}</h2>
                <p className="text-sm text-foreground-soft">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-foreground-soft">{content.footer.tagline}</p>
          <LanguageSwitcher />
        </div>
      </footer>
    </>
  )
}
