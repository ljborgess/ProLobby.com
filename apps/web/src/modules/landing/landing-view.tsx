'use client'

import Link from 'next/link'
import { useLandingContent } from '@/hooks/use-landing-content'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { PairingNetwork } from './pairing-network'
import { QueueBoard } from './queue-board'
import { SectionThread, SectionThreadEnd } from './section-thread'

const FEATURE_ICONS = [
  // shield — identidade verificada
  <path key="shield" d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />,
  // queue — fila por posição
  <path key="queue" d="M4 6h16M4 12h16M4 18h10" />,
  // link — vínculo com Discord
  <path key="link" d="M9 15l6-6M9 9h6v6" />,
]

/**
 * The public landing — issue #171, redesigned 2026-09-22
 * (docs/produto/01-visao/01-visao.md, "A landing pública sai do gatilho
 * acima"). Structure follows gamersclub.com.br, read at the user's request;
 * everything else is ours.
 *
 * Three constraints shape every visual here, all deliberate:
 *
 * - **No photography.** The reference carries its weight with game art we have
 *   no licence to ship, so depth comes from drawn layers instead: a pitch in
 *   SVG, a perspective floor, mesh gradients, a woven texture, scrims. The
 *   image slots are ready for art the user supplies; nothing is borrowed.
 * - **No invented traction.** Fase 2.3 has no queue, so `facts` carries only
 *   already-decided spec numbers — never a made-up "jogadores online".
 * - **No animation library.** Every effect is native CSS (keyframes, registered
 *   custom properties, scroll-driven `animation-timeline`), per the same doc's
 *   "nativo primeiro" rule. All of it is no-op'd under
 *   `prefers-reduced-motion` in globals.css — RNF-015.
 *
 * Client component, like SignUpHeading, so the language switch re-renders this
 * copy without a navigation.
 */
export function LandingView() {
  const content = useLandingContent()

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/5 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            Pro<span className="text-accent">Lobby</span>
          </span>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="landing-focus rounded-full border border-white/15 px-5 py-2 text-sm text-foreground-soft transition-colors hover:border-white/35 hover:text-foreground"
            >
              {content.topBar.signIn}
            </Link>
            <Link
              href="/sign-up"
              className="landing-focus landing-sheen rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-transform duration-200 hover:scale-[1.04] active:scale-95"
            >
              {content.topBar.cta}
            </Link>
          </nav>
        </div>
        <div
          aria-hidden
          className="landing-progress-bar h-px w-full bg-gradient-to-r from-accent via-accent to-gold"
        />
      </header>

      {/* svh, not vh: on a phone `vh` is the viewport with the browser's own
          chrome pretended away, so a 100vh hero is taller than the screen and
          the copy starts below the fold. */}
      <section className="relative flex min-h-[92svh] flex-1 items-center overflow-hidden px-4 py-24 sm:px-6">
        <HeroBackdrop />

        {/* One centred column, not copy beside a card.
         *
         * The right-hand side used to hold a "Lobby" card listing the five
         * categories — a flat list that said nothing the headline did not, and
         * that repeated the queue board two sections below almost exactly. It
         * went. The pairing graph behind the text is the hero's picture now,
         * and it is the one thing on this page no competitor's landing has. */}
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
          <div className="text-center">
            <span
              className="landing-fade-up inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-accent"
              style={{ '--landing-delay': '0s' } as React.CSSProperties}
            >
              <span className="landing-glow size-1.5 rounded-full bg-accent" />
              EA FC Pro Clubs
            </span>

            <h1
              className="landing-fade-up landing-display mt-8 font-display text-foreground"
              style={{ '--landing-delay': '0.06s' } as React.CSSProperties}
            >
              {content.hero.titlePrefix}
              <span className="landing-gradient-text">{content.hero.titleAccent}</span>
              {content.hero.titleSuffix}
            </h1>

            {/* No call to action here: the top bar carries the only "Criar
                conta" and "Entrar" on the page, and it is sticky, so it stays
                in reach from every section. */}
            <p
              className="landing-fade-up mx-auto mt-7 max-w-lg text-base leading-relaxed text-foreground-soft/85"
              style={{ '--landing-delay': '0.16s' } as React.CSSProperties}
            >
              {content.hero.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Every seam from here down is threaded, and the threads are numbered:
          the page reads as one route with landmarks rather than five panels
          stacked. `seam` drops each section's top rule, because a full-width
          hairline across the landing point would cut the thread in half. */}
      <SectionThread step={1} variant="line" />

      <Section seam>
        <SectionHeading eyebrow={content.facts.eyebrow} align="center" />
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {content.facts.items.map((fact) => (
            <div
              key={fact.label}
              className="landing-reveal landing-card landing-sheen flex flex-col items-center rounded-md border border-white/10 px-4 py-7 text-center"
            >
              <span className="font-display text-4xl font-light tracking-tight text-accent">
                {fact.value}
              </span>
              <span className="mt-2 text-sm leading-snug text-foreground-soft">{fact.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <SectionThread step={2} variant="fork" />

      <Section seam className="landing-weave bg-surface">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <div className="landing-reveal flex-1 text-center lg:text-left">
            <SectionHeading
              eyebrow={content.positions.eyebrow}
              title={content.positions.title}
              body={content.positions.body}
            />
            <div className="mt-7 flex flex-wrap justify-center gap-2 lg:justify-start">
              {content.positions.items.map((position) => (
                <span
                  key={position}
                  className="landing-card rounded-full border border-white/10 px-4 py-1.5 text-sm text-foreground"
                >
                  {position}
                </span>
              ))}
            </div>
          </div>

          <div className="landing-parallax-fast relative w-full flex-1">
            <QueueBoard />
          </div>
        </div>
      </Section>

      <SectionThread step={3} variant="dashes" />

      <Section seam className="overflow-hidden">
        <div
          aria-hidden
          className="landing-parallax-slow pointer-events-none absolute inset-x-0 -top-1/4 -z-10 h-[150%] bg-[radial-gradient(ellipse_50%_40%_at_20%_40%,_var(--color-accent-strong)_0%,_transparent_70%)] opacity-[0.10]"
        />
        <div className="flex flex-col items-center gap-12 lg:flex-row-reverse lg:gap-16">
          <div className="landing-reveal flex-1 text-center lg:text-left">
            <SectionHeading
              eyebrow={content.soloQueue.eyebrow}
              title={content.soloQueue.title}
              body={content.soloQueue.body}
            />
          </div>

          {/* The lobby filling up, drawn rather than screenshotted — the real
              queue screen is Fase 2.5 and does not exist to capture yet. */}
          <div aria-hidden className="landing-parallax-fast relative h-64 w-full flex-1">
            {content.positions.items.map((position, index) => (
              <div
                key={position}
                // Stepped down and to the right, never straight down: each card
                // has to clear the one above it by more than its own label, or
                // the stack reads as a single card with a shadow.
                className="landing-card absolute flex w-48 items-center gap-3 rounded-md border border-white/10 px-4 py-3 backdrop-blur"
                style={{ left: `${index * 11}%`, top: `${index * 34}px`, zIndex: index }}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-xs font-semibold text-accent">
                  {index + 1}
                </span>
                <span className="truncate text-sm text-foreground">{position}</span>
                <span className="landing-glow ml-auto size-2 shrink-0 rounded-full bg-accent" />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <SectionThread step={4} variant="jog" />

      <Section seam className="bg-surface">
        <SectionHeading eyebrow={content.features.eyebrow} align="center" />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {content.features.items.map((item, index) => (
            <div
              key={item.title}
              className="landing-reveal landing-card landing-sheen flex flex-col items-center gap-4 rounded-md border border-white/10 px-6 py-9 text-center"
            >
              <span className="flex size-12 items-center justify-center rounded-full border border-accent/25 bg-accent/10">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="size-6 text-accent"
                >
                  {FEATURE_ICONS[index]}
                </svg>
              </span>
              <h2 className="font-display text-lg font-medium tracking-tight text-foreground">
                {item.title}
              </h2>
              <p className="text-sm leading-relaxed text-foreground-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <SectionThreadEnd />

      <footer className="landing-weave px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div aria-hidden className="landing-rule" />
          <div className="mt-8 flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <span className="font-display text-base font-semibold text-foreground">
                Pro<span className="text-accent">Lobby</span>
              </span>
              <p className="mt-1 text-sm text-foreground-soft">{content.footer.tagline}</p>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </footer>
    </>
  )
}

/** Shared section frame: one max width, one vertical rhythm, one hairline. */
function Section({
  children,
  className = '',
  seam = false,
}: {
  children: React.ReactNode
  className?: string
  seam?: boolean
}) {
  return (
    <section
      className={`relative px-4 py-24 sm:px-6 ${seam ? '' : 'border-t border-white/5'} ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  )
}

function SectionHeading({
  eyebrow,
  title,
  body,
  align = 'left',
}: {
  eyebrow: string
  title?: string
  body?: string
  align?: 'left' | 'center'
}) {
  return (
    <div className={align === 'center' ? 'text-center' : undefined}>
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-accent">{eyebrow}</p>
      {title ? (
        <h2 className="landing-section-title mt-4 font-display text-foreground">{title}</h2>
      ) : null}
      {body ? (
        <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground-soft">{body}</p>
      ) : null}
    </div>
  )
}

/** Every layer behind the hero, in one place so the stacking order is readable. */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="landing-parallax-slow absolute inset-x-0 -top-1/4 h-[150%]">
        <div className="landing-glow absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,_var(--color-accent-strong)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_85%_30%,_var(--color-gold)_0%,_transparent_70%)] opacity-[0.07]" />
        {/*
         * The background clip goes here, and there is none yet — on purpose.
         *
         * A `<video>` pointing at `public/media/hero.{webm,mp4}` shipped here
         * briefly and those files do not exist, so every visitor collected two
         * 404s in the console and the CSP e2e (which fails on any console
         * error) went red. An element that requests a file we have not got is
         * not a placeholder, it is a broken request.
         *
         * To turn it on: drop a clip you hold the rights to at those two paths
         * and render a muted, looping, `playsInline` <video> covering this
         * box. Game footage from EA FC is EA's and cannot be one of them. What
         * the clip must be: loop-safe (last frame matching the first), quiet
         * and slow enough to read as texture behind the headline, and a couple
         * of MB at most — it sits in the critical view and RNF-001 budgets the
         * page under 1 s. `media-src 'self'` is already in the CSP for it.
         */}
      </div>
      {/* The pairing graph, wide and faint, sitting behind the whole row so it
          reads as the backdrop the copy and the lobby card stand on. */}
      {/* Bigger and brighter since the hero went single-column: with the lobby
          card gone this is the only picture up here, so it has to carry. */}
      <PairingNetwork className="absolute inset-x-0 top-[4%] h-[82%] w-full opacity-90" />
      <div className="landing-floor absolute inset-x-0 bottom-0 h-72 opacity-50" />
      <div className="landing-weave absolute inset-0" />
      {/* Scrims, in order: vignette, a wash in the page colour so the clip and
          the floor read as texture rather than as "a video playing", a
          directional veil over the reading edge only, and a hard fade into the
          next section. The directional one is why the copy can be thin and
          still legible while the art keeps its contrast. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,_transparent_0%,_var(--color-bg)_100%)]" />
      <div className="absolute inset-0 bg-background/45" />
      <div className="landing-scrim-edge absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  )
}
