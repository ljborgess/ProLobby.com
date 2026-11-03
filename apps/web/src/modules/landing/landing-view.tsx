'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Logo, LogoMark } from '@/common/ui/logo'
import type { CharacterCategory } from '@/content/character'
import { useCharacterContent } from '@/hooks/use-character-content'
import { useLandingContent } from '@/hooks/use-landing-content'
import { initialsOf, KitShirt } from '@/modules/kit/kit-art'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { PairingNetwork } from './pairing-network'
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
export function LandingView({ signedIn = false }: { signedIn?: boolean }) {
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
            {signedIn ? (
              <Link
                href="/verifications"
                className="landing-focus landing-sheen rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-transform duration-200 hover:scale-[1.04] active:scale-95"
              >
                {content.topBar.account}
              </Link>
            ) : (
              <>
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
              </>
            )}
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
      <section className="relative flex min-h-[92svh] flex-1 items-center overflow-hidden px-4 pb-20 pt-28 sm:px-6">
        <HeroBackdrop />

        {/* The corner bug, pinned to the frame like a broadcast's. */}
        <div className="absolute inset-x-0 top-6 z-10 px-4 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <Scorebug stage={content.broadcast.stage} clockLabel={content.broadcast.clockLabel} />
          </div>
        </div>

        {/* The opening frame of a matchday broadcast (2026-10-29): the scorebug
            in the corner, the opening graphic on the left, the team sheet on
            the right. Pre-match, never "live": nothing on this page is a match
            in progress, and the clock is the queue's real 30 s. */}
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="flex flex-col items-start">
            <h1 className="landing-display landing-opening font-display text-foreground">
              <HeroWords
                prefix={content.hero.titlePrefix}
                accent={content.hero.titleAccent}
                suffix={content.hero.titleSuffix}
              />
            </h1>

            {/* No call to action here: the top bar carries "Criar conta" and
                "Entrar", sticky, so it stays in reach from every segment. */}
            <p
              className="landing-fade-up mt-7 max-w-xl text-base leading-relaxed text-foreground-soft sm:text-lg"
              style={{ '--landing-delay': '0.16s' } as React.CSSProperties}
            >
              {content.hero.subtitle}
            </p>
          </div>

          <LineupSheet
            title={content.broadcast.lineup}
            example={content.broadcast.example}
            caption={content.hero.squadCaption}
          />
        </div>
      </section>

      {/* Every seam from here down is threaded, and the threads are numbered:
          the page reads as one route with landmarks rather than five panels
          stacked. `seam` drops each section's top rule, because a full-width
          hairline across the landing point would cut the thread in half. */}
      <SectionThread variant="line" />

      {/* How it works as a broadcast run of show (finish review, 2026-10-29):
          one rule, three stations in the order a player lives them, the copy
          hanging under each at its own width. Not three equal feature columns. */}
      <Section seam className="bg-surface">
        <h2 className="sr-only">{content.features.eyebrow}</h2>
        <ol className="landing-runshow grid gap-10 md:grid-cols-[1.15fr_1fr_0.85fr] md:gap-0">
          {content.features.items.map((item, index) => (
            <li
              key={item.title}
              className={`landing-reveal landing-reveal-${index + 2} landing-runshow-station relative flex flex-col gap-3 md:pr-10`}
            >
              <span className="landing-runshow-mark" aria-hidden />
              <h3 className="font-numeric text-2xl font-bold uppercase tracking-[0.08em] text-foreground sm:text-3xl">
                {item.title}
              </h3>
              <p className="max-w-sm text-[0.95rem] leading-relaxed text-foreground-soft">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <SectionThread variant="jog" />

      {/* A scoreboard, not four stat cards (refine pass, 2026-10-29): one
          panel cut by hairlines reads as a single instrument with four
          readouts, where four boxed cards read as a template. The eyebrow
          moves into the panel's head row, where a label belongs on a placar. */}
      <Section seam>
        <div className="landing-reveal landing-scoreboard overflow-hidden rounded-lg border border-white/10 bg-surface">
          <p className="border-b border-white/10 px-5 py-3 sm:px-7">
            <Plate>{content.facts.eyebrow}</Plate>
          </p>
          <dl className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-3">
            {content.facts.items.map((fact) => (
              <div
                key={fact.label}
                className="flex flex-col-reverse gap-2 bg-surface px-5 py-7 sm:px-7"
              >
                <dt className="text-sm leading-snug text-foreground-soft">{fact.label}</dt>
                <dd className="landing-score-value font-numeric font-bold tracking-[0.02em] text-foreground">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <SectionThread variant="fork" />

      <Section seam className="landing-weave bg-surface">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <div
            className="landing-slide-x flex-1 text-center lg:text-left"
            style={{ '--landing-from': '-32px' } as React.CSSProperties}
          >
            <SectionHeading title={content.positions.title} body={content.positions.body} />
          </div>

          <div className="w-full flex-1">
            <PositionPicker />
          </div>
        </div>
      </Section>

      <SectionThread variant="dashes" />

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
            <SectionHeading title={content.soloQueue.title} body={content.soloQueue.body} />
          </div>

          <LobbyFill
            positions={content.positions.items}
            labels={content.queueBoard}
            badge={`${content.broadcast.replay} · ${content.broadcast.example}`}
          />
        </div>
      </Section>

      <Closing signedIn={signedIn} />

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
  title,
  body,
  align = 'left',
}: {
  title?: string
  body?: string
  align?: 'left' | 'center'
}) {
  // Title, then body — each finishing further into the scroll,
  // so the heading reads as arriving rather than as a block switching on.
  return (
    <div className={align === 'center' ? 'text-center' : undefined}>
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
  badge,
}: {
  positions: string[]
  labels: { title: string; example: string; filled: string; waiting: string }
  /** The segment's name strip, pinned to the panel's top edge. */
  badge: string
}) {
  return (
    <div
      aria-hidden
      className="landing-lobby w-full flex-1"
      style={{ '--lobby-total': positions.length } as React.CSSProperties}
    >
      <div className="landing-lobby-panel relative rounded-lg border border-white/10 bg-surface p-5 pt-7 sm:p-6 sm:pt-8">
        <Plate className="landing-lower-third absolute -top-4 left-4">{badge}</Plate>
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
      <div className="landing-weave absolute inset-0" />
      {/* Scrims, in order: vignette, a wash in the page colour so the clip and
          the floor read as texture rather than as "a video playing", a
          directional veil over the reading edge only, and a hard fade into the
          next section. The directional one is why the copy can be thin and
          still legible while the art keeps its contrast. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,_transparent_0%,_var(--color-bg)_100%)]" />
      <div className="absolute inset-0 bg-background/45" />
      <div className="landing-scrim-edge absolute inset-0" />
      {/* The pitch underfoot, above the washes so it reads as the frame's floor. */}
      <div className="landing-floor absolute inset-x-0 bottom-0 h-80 opacity-90" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  )
}

/**
 * The close: the offer once more, with its two doors, under a floodlight.
 * With a session there is one door, and it leads to the queue.
 */
function Closing({ signedIn }: { signedIn: boolean }) {
  const content = useLandingContent().closing
  return (
    <section className="landing-closing relative overflow-clip px-4 py-28 sm:px-6">
      <div className="landing-reveal relative mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
        <h2 className="landing-section-title font-display text-foreground">{content.title}</h2>
        <p className="max-w-lg text-base leading-relaxed text-foreground-soft">{content.body}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={signedIn ? '/queue' : '/sign-up'}
            className="landing-focus landing-sheen inline-flex min-h-12 items-center rounded-full bg-accent px-7 text-base font-medium text-background shadow-[0_20px_45px_rgb(0_0_0/35%)] transition-transform duration-200 hover:scale-[1.04] active:scale-95"
          >
            {signedIn ? content.signedInCta : content.cta}
          </Link>
          {!signedIn && (
            <Link
              href="/login"
              className="landing-focus inline-flex min-h-12 items-center rounded-full border border-white/20 px-6 text-sm text-foreground-soft transition-colors hover:border-white/40 hover:text-foreground"
            >
              {content.signIn}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * A broadcast plate: a slanted label with a green tab, the way a matchday
 * transmission names a segment. Drawn in by a clip when it scrolls in; it
 * never moves anything interactive.
 */
function Plate({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`landing-plate inline-flex items-center gap-2.5 font-numeric text-sm font-semibold uppercase tracking-[0.14em] text-foreground ${className}`}
    >
      <span aria-hidden className="landing-plate-tab" />
      {children}
    </span>
  )
}

/**
 * The scorebug in the opening frame: the brand, the stage of the day and the
 * queue's real clock. A spec number, not a running match.
 */
function Scorebug({ stage, clockLabel }: { stage: string; clockLabel: string }) {
  return (
    <div
      className="landing-fade-up landing-scorebug inline-flex items-stretch overflow-hidden rounded-sm border border-white/15 bg-surface/90 font-numeric uppercase shadow-[0_8px_20px_rgb(0_0_0/35%)]"
      style={{ '--landing-delay': '0s' } as React.CSSProperties}
    >
      <span className="flex items-center gap-2 bg-foreground px-3 text-sm font-bold tracking-[0.06em] text-background">
        <LogoMark className="size-4" />
        Pro Lobby
      </span>
      <span className="flex items-center gap-2 px-3 text-sm font-semibold tracking-[0.12em] text-foreground">
        <span aria-hidden className="size-1.5 rounded-full bg-accent" />
        {stage}
      </span>
      <span className="flex items-baseline gap-2 border-l border-white/15 px-3 py-1.5">
        <span className="text-xl font-bold leading-none tabular-nums text-accent">0:30</span>
        <span className="text-[0.7rem] font-semibold normal-case tracking-normal text-foreground-soft">
          {clockLabel}
        </span>
      </span>
    </div>
  )
}

/**
 * The team sheet beside the opening graphic (2026-10-29): five shirts, one per
 * position, each verified — the product in one glance. Labelled as an example:
 * no real squad is shown. The kit is the default one, so no club is implied.
 */
function LineupSheet({
  title,
  example,
  caption,
}: {
  title: string
  example: string
  caption: string
}) {
  const character = useCharacterContent()
  return (
    <figure
      className="landing-fade-up landing-lineup relative overflow-hidden rounded-lg border border-white/12 bg-surface/80 shadow-[0_20px_45px_rgb(0_0_0/35%),inset_0_1px_0_rgb(255_255_255/6%)] backdrop-blur-sm"
      style={{ '--landing-delay': '0.25s' } as React.CSSProperties}
    >
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <Plate>{title}</Plate>
        <span className="font-numeric text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-foreground-soft">
          {example}
        </span>
      </header>
      <ol className="flex flex-col">
        {SQUAD.map(({ category, number }, index) => (
          <li
            key={category}
            className="landing-lineup-row flex items-center gap-4 border-b border-white/[0.06] px-5 py-2.5 last:border-b-0"
            style={{ '--row': index } as React.CSSProperties}
          >
            <span className="w-7 font-numeric text-2xl font-bold leading-none tabular-nums text-foreground-soft">
              {number}
            </span>
            <KitShirt
              kit={{ primary: 'white', secondary: 'navy', pattern: 'plain', crest: 'shield' }}
              initials={initialsOf('ProLobby')}
              className="w-9 shrink-0 drop-shadow-[0_6px_10px_rgb(0_0_0/45%)]"
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-numeric text-lg font-bold uppercase leading-tight tracking-[0.08em] text-foreground">
                {character.categoryCodes[category]}
              </span>
              <span className="truncate text-xs text-foreground-soft">
                {character.categories[category]}
              </span>
            </span>
            <span className="flex size-6 items-center justify-center rounded-full bg-accent text-background">
              <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="none">
                <path
                  d="m3.5 8.5 3 3 6-7"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="border-t border-white/10 px-5 py-3 text-xs leading-relaxed text-foreground-soft">
        {caption}
      </figcaption>
    </figure>
  )
}

/**
 * Choose your position (2026-10-29, in place of the tactical pitch): five
 * shirts as native radios; the chosen one says what the queue does for that
 * place. The mechanism, not a number: no elo or count is shown, so nothing
 * here can be invented.
 */
function PositionPicker() {
  const content = useLandingContent()
  const character = useCharacterContent()
  const [chosen, setChosen] = useState<CharacterCategory>('midfielder')
  const code = character.categoryCodes[chosen]
  const name = character.categories[chosen]

  return (
    <div className="flex w-full flex-col gap-5">
      <Plate className="self-start">{content.broadcast.pick}</Plate>
      <div
        role="radiogroup"
        aria-label={content.broadcast.pick}
        className="grid grid-cols-5 gap-2 sm:gap-3"
      >
        {SQUAD.map(({ category, number }) => {
          const on = category === chosen
          return (
            <label
              key={category}
              className={`landing-pick group relative flex min-h-11 cursor-pointer flex-col items-center gap-2 rounded-md border px-1 pb-3 pt-4 transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                on
                  ? 'border-accent/60 bg-accent/[0.08]'
                  : 'border-white/10 bg-surface hover:border-white/30'
              }`}
            >
              <input
                type="radio"
                name="landing-position"
                checked={on}
                onChange={() => setChosen(category)}
                aria-label={character.categories[category]}
                className="sr-only"
              />
              <KitShirt
                kit={{
                  primary: on ? 'green' : 'white',
                  secondary: 'navy',
                  pattern: 'plain',
                  crest: 'shield',
                }}
                initials={initialsOf('ProLobby')}
                className="w-10 drop-shadow-[0_8px_12px_rgb(0_0_0/45%)] sm:w-14"
              />
              <span
                aria-hidden
                className={`font-numeric text-base font-bold uppercase tracking-[0.1em] sm:text-lg ${on ? 'text-accent' : 'text-foreground'}`}
              >
                {character.categoryCodes[category]}
              </span>
              <span aria-hidden className="sr-only">
                {number}
              </span>
            </label>
          )
        })}
      </div>
      {/* Polite: a click reads the new place once, not a running commentary. */}
      <div
        aria-live="polite"
        className="landing-pick-sheet rounded-md border border-white/10 bg-surface p-5 sm:p-6"
      >
        <p key={chosen} className="landing-pick-text flex flex-col gap-3">
          <span className="font-display text-xl font-light text-foreground sm:text-2xl">
            {content.positions.picker.entersAs(code)}
          </span>
          <span className="text-[0.95rem] leading-relaxed text-foreground-soft">
            {content.positions.picker.pairs(name)}
          </span>
          <span className="text-[0.95rem] leading-relaxed text-foreground-soft">
            {content.positions.picker.elo(code)}
          </span>
        </p>
      </div>
    </div>
  )
}
