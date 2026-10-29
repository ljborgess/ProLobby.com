'use client'

import Link from 'next/link'
import { Logo } from '@/common/ui/logo'
import type { CharacterCategory } from '@/content/character'
import { useCharacterContent } from '@/hooks/use-character-content'
import { useLandingContent } from '@/hooks/use-landing-content'
import { initialsOf, KitShirt } from '@/modules/kit/kit-art'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { PairingNetwork } from './pairing-network'
import { QueueBoard } from './queue-board'
import { SectionThread, SectionThreadEnd } from './section-thread'
import { TopBarTicker } from './top-bar-ticker'

/** The five places of the squad drawing in the hero, in pitch order. */
const SQUAD: { category: CharacterCategory; number: number }[] = [
  { category: 'goalkeeper', number: 1 },
  { category: 'defender', number: 4 },
  { category: 'midfielder', number: 8 },
  { category: 'winger', number: 7 },
  { category: 'striker', number: 9 },
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
        <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <span className="font-display text-lg font-semibold tracking-tight text-foreground">
              <Logo />
            </span>
            <TopBarTicker items={content.topBar.ticker} />
          </div>
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
              <span className="landing-dot size-1.5 rounded-full bg-accent" />
              EA FC Pro Clubs
            </span>

            <h1 className="landing-display mt-8 font-display text-foreground">
              <HeroWords
                prefix={content.hero.titlePrefix}
                accent={content.hero.titleAccent}
                suffix={content.hero.titleSuffix}
              />
            </h1>

            {/* No call to action here: the top bar carries the only "Criar
                conta" and "Entrar" on the page, and it is sticky, so it stays
                in reach from every section. */}
            <p
              className="landing-fade-up mx-auto mt-7 max-w-xl text-base leading-relaxed text-foreground-soft sm:text-lg"
              style={{ '--landing-delay': '0.16s' } as React.CSSProperties}
            >
              {content.hero.subtitle}
            </p>

            <HeroSquad caption={content.hero.squadCaption} />
          </div>
        </div>
      </section>

      {/* Every seam from here down is threaded, and the threads are numbered:
          the page reads as one route with landmarks rather than five panels
          stacked. `seam` drops each section's top rule, because a full-width
          hairline across the landing point would cut the thread in half. */}
      <SectionThread step={1} variant="line" />

      {/* How it works, right under the hero (second refine, 2026-10-29): three
          numbered steps on a hairline, in the order a player lives them. The
          numerals are scoreboard lettering, outlined until they light. */}
      <Section seam className="bg-surface">
        <SectionHeading eyebrow={content.features.eyebrow} />
        <div className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {content.features.items.map((item, index) => (
            <div
              key={item.title}
              className={`landing-reveal landing-reveal-${index + 2} flex flex-col gap-3 border-t border-white/10 pt-6`}
            >
              <span
                aria-hidden
                className="landing-step-numeral font-numeric text-6xl font-bold leading-none"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <h2 className="font-display text-xl font-medium tracking-tight text-foreground">
                {item.title}
              </h2>
              <p className="max-w-xs text-[0.95rem] leading-relaxed text-foreground-soft">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <SectionThread step={2} variant="jog" />

      {/* A scoreboard, not four stat cards (refine pass, 2026-10-29): one
          panel cut by hairlines reads as a single instrument with four
          readouts, where four boxed cards read as a template. The eyebrow
          moves into the panel's head row, where a label belongs on a placar. */}
      <Section seam>
        <div className="landing-reveal landing-scoreboard overflow-hidden rounded-lg border border-white/10 bg-surface">
          <p className="flex items-center gap-2 border-b border-white/10 px-5 py-3 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft sm:px-7">
            <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 text-accent" fill="none">
              <path
                d="m3.5 8.5 3 3 6-7"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {content.facts.eyebrow}
          </p>
          <dl className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
            {content.facts.items.map((fact) => (
              <div
                key={fact.label}
                className="flex flex-col-reverse gap-2 bg-surface px-5 py-7 sm:px-7"
              >
                <dt className="text-sm leading-snug text-foreground-soft">{fact.label}</dt>
                <dd className="landing-score-value font-display text-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <SectionThread step={3} variant="fork" />

      <Section seam className="landing-weave bg-surface">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <div
            className="landing-slide-x flex-1 text-center lg:text-left"
            style={{ '--landing-from': '-32px' } as React.CSSProperties}
          >
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

          {/* Two animation classes never go on one element: each sets the
              `animation` shorthand, so the later rule wins outright and the
              loser's starting state sticks. Stacking `landing-slide-x` on this
              parallax wrapper left the board at `opacity: 0` permanently — the
              pitch simply vanished from the page. Parallax on the outside,
              slide on the inside. */}
          <div className="landing-parallax-fast relative w-full flex-1">
            <div
              className="landing-slide-x"
              style={{ '--landing-from': '32px' } as React.CSSProperties}
            >
              <QueueBoard />
            </div>
          </div>
        </div>
      </Section>

      <SectionThread step={4} variant="dashes" />

      {/* `overflow-clip`, not `overflow-hidden`: hidden makes the section a
          scroll container, and the lobby's view timeline would then track
          this box (which never scrolls) instead of the page. */}
      <Section seam className="overflow-clip">
        <div
          aria-hidden
          className="landing-parallax-slow pointer-events-none absolute inset-x-0 -top-1/4 -z-10 h-[150%] bg-[radial-gradient(ellipse_50%_40%_at_20%_40%,_color-mix(in_srgb,var(--color-accent-strong)_7%,transparent)_0%,_transparent_70%)]"
        />
        <div className="flex flex-col items-center gap-12 lg:flex-row-reverse lg:gap-16">
          <div className="landing-reveal flex-1 text-center lg:text-left">
            <SectionHeading
              eyebrow={content.soloQueue.eyebrow}
              title={content.soloQueue.title}
              body={content.soloQueue.body}
            />
          </div>

          <LobbyFill positions={content.positions.items} labels={content.queueBoard} />
        </div>
      </Section>

      <Closing />

      <SectionThreadEnd />

      <footer className="landing-weave px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div aria-hidden className="landing-rule" />
          <div className="mt-8 flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <span className="font-display text-base font-semibold text-foreground">
                <Logo />
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
  // Eyebrow, then title, then body — each finishing further into the scroll,
  // so the heading reads as arriving rather than as a block switching on.
  return (
    <div className={align === 'center' ? 'text-center' : undefined}>
      <p className="landing-reveal text-[0.7rem] font-medium uppercase tracking-[0.22em] text-accent">
        {eyebrow}
      </p>
      {title ? (
        <h2 className="landing-reveal landing-reveal-2 landing-section-title mt-4 font-display text-foreground">
          {title}
        </h2>
      ) : null}
      {body ? (
        <p className="landing-reveal landing-reveal-3 mt-4 max-w-xl text-base leading-relaxed text-foreground-soft">
          {body}
        </p>
      ) : null}
    </div>
  )
}

/**
 * The headline, one word at a time.
 *
 * A single fade on the whole block reads as a slide switching; words arriving
 * in sequence reads as a sentence being said. The stagger is small on purpose
 * — 45ms a word — so the line still lands as one thought rather than a ticker.
 *
 * Each word is `inline-block` because a transform does not apply to an inline
 * box, and the spaces stay outside the spans so the line still wraps where the
 * browser would have wrapped it. The accent word keeps its gradient by being
 * one span among the rest, not a separate treatment.
 */
function HeroWords({ prefix, accent, suffix }: { prefix: string; accent: string; suffix: string }) {
  const words = [
    ...prefix
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((text) => ({ text, accent: false })),
    { text: accent, accent: true },
    ...suffix
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((text) => ({ text, accent: false })),
  ]

  return (
    <>
      {words.map((word, index) => (
        <span key={`${word.text}-${index}`}>
          <span
            // Solid accent, not the old green-to-amber gradient: amber in a
            // headline is amber being read, and DESIGN.md's Âmbar Mudo says it
            // never is.
            className={`landing-fade-up inline-block ${word.accent ? 'text-accent' : ''}`}
            style={{ '--landing-delay': `${0.06 + index * 0.045}s` } as React.CSSProperties}
          >
            {word.text}
          </span>{' '}
        </span>
      ))}
    </>
  )
}

/**
 * The lobby filling up, seat by seat — the page's one authored motion moment
 * (refine pass, 2026-10-29).
 *
 * Drawn rather than screenshotted: the real queue screen is the Túnel do
 * Vestiário, and it has no lobby list to capture. On a scroll timeline each
 * seat locks in turn (dashed ring to solid, "na fila" to "confirmado"), the
 * readout counts up with them through a registered integer, and the panel's
 * edge lights when the last seat locks. The rest state, which is also what
 * reduced motion and browsers without scroll timelines get, is the lobby
 * closed: every seat confirmed, the count full.
 *
 * Normal flow, not the old absolutely-positioned stack: that one had a fixed
 * height and clipped its last three cards on a phone. The stair step survives
 * as an indent from `lg` up.
 *
 * `aria-hidden` like the queue board's pitch: invented seats read aloud would
 * be a lobby that does not exist. The caption says it is an example.
 */
function LobbyFill({
  positions,
  labels,
}: {
  positions: string[]
  labels: { title: string; example: string; filled: string; waiting: string }
}) {
  return (
    <div
      aria-hidden
      className="landing-lobby w-full flex-1"
      style={{ '--lobby-total': positions.length } as React.CSSProperties}
    >
      <div className="landing-lobby-panel rounded-lg border border-white/10 bg-surface p-5 sm:p-6">
        <div className="flex items-center justify-between text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft">
          <span>{labels.title}</span>
          <span className="landing-lobby-count font-display text-base font-light tracking-normal text-foreground tabular-nums" />
        </div>
        <ol className="mt-5 flex flex-col gap-2">
          {positions.map((position, index) => (
            <li
              key={position}
              className="landing-lobby-row flex items-center gap-3 rounded-md border border-white/10 px-3 py-2.5"
              style={{ '--i': index } as React.CSSProperties}
            >
              <span className="landing-lobby-seat flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums">
                {index + 1}
              </span>
              <span className="truncate text-sm text-foreground">{position}</span>
              <span className="landing-lobby-state ml-auto grid text-xs">
                <span className="landing-lobby-wait text-foreground-soft">{labels.waiting}</span>
                <span className="landing-lobby-ok text-accent">{labels.filled}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-3 text-xs text-foreground-soft">{labels.example}</p>
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

/**
 * The squad under the headline (refine, 2026-10-29): five shirts, one per
 * position, each with the verified tick — what the product is, drawn, in the
 * first viewport. The kit is the default one, so no club is implied.
 */
function HeroSquad({ caption }: { caption: string }) {
  const codes = useCharacterContent().categoryCodes
  return (
    <figure className="mt-12 flex flex-col items-center gap-4">
      <ul className="flex items-end justify-center gap-3 sm:gap-6">
        {SQUAD.map(({ category, number }, index) => (
          <li
            key={category}
            className="landing-fade-up flex flex-col items-center gap-2"
            style={{ '--landing-delay': `${0.3 + index * 0.08}s` } as React.CSSProperties}
          >
            <span className="relative">
              <KitShirt
                kit={{ primary: 'white', secondary: 'navy', pattern: 'plain', crest: 'shield' }}
                initials={initialsOf('ProLobby')}
                className={`drop-shadow-[0_12px_18px_rgb(0_0_0/45%)] ${index === 2 ? 'w-16 sm:w-20' : 'w-12 sm:w-16'}`}
              />
              <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-accent text-background shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_55%,transparent)]">
                <svg viewBox="0 0 16 16" aria-hidden className="size-3" fill="none">
                  <path
                    d="m3.5 8.5 3 3 6-7"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="sr-only">{number}</span>
            </span>
            <span className="font-numeric text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
              {codes[category]}
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="text-sm text-foreground-soft">{caption}</figcaption>
    </figure>
  )
}

/** The close: the offer once more, with its two doors, under a floodlight. */
function Closing() {
  const content = useLandingContent().closing
  return (
    <section className="landing-closing relative overflow-clip px-4 py-28 sm:px-6">
      <div className="landing-reveal relative mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
        <h2 className="landing-section-title font-display text-foreground">{content.title}</h2>
        <p className="max-w-lg text-base leading-relaxed text-foreground-soft">{content.body}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="landing-focus landing-sheen inline-flex min-h-12 items-center rounded-full bg-accent px-7 text-base font-medium text-background shadow-[0_20px_45px_rgb(0_0_0/35%)] transition-transform duration-200 hover:scale-[1.04] active:scale-95"
          >
            {content.cta}
          </Link>
          <Link
            href="/login"
            className="landing-focus inline-flex min-h-12 items-center rounded-full border border-white/20 px-6 text-sm text-foreground-soft transition-colors hover:border-white/40 hover:text-foreground"
          >
            {content.signIn}
          </Link>
        </div>
      </div>
    </section>
  )
}
