'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { DISCORD_BLURPLE, DiscordMark } from '@/common/ui/icons'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { Logo } from '@/common/ui/logo'
import { useNavContent } from '@/hooks/use-nav-content'
import { MenuRing, SignOutButton } from './sign-out-button'

const LINKS = [
  ['/verifications', 'home', HomeMark],
  ['/queue', 'queue', QueueMark],
  ['/account/character', 'squad', SquadMark],
  ['/account/club', 'club', ClubMark],
] as const

/**
 * The one header behind the login (audits of 2026-10-28 and 2026-10-29).
 *
 * Built like a game's main menu: the logo, four tabs with their marks and a
 * lit bar under the one you are on, and the account behind a single button.
 * Language and signing out live in that menu, not on the bar: they are
 * set once, and a sign-out icon beside the tabs was the easiest thing on the
 * page to hit by mistake.
 *
 * The logo always comes first, and the bar stays pinned to the top while the
 * page scrolls (`fixed`, the default); the queue, a scene that never
 * scrolls, places it itself.
 */
export function AppHeader({
  className = '',
  inert,
  fixed = true,
}: {
  className?: string
  inert?: boolean
  fixed?: boolean
}) {
  const content = useNavContent()
  const pathname = usePathname()

  const bar = (
    <header
      inert={inert}
      className={`mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr_auto] ${className}`}
    >
      <Link
        href="/verifications"
        aria-label={content.homeLabel}
        className="landing-focus inline-flex min-h-11 items-center justify-self-start rounded-full font-display text-base font-semibold tracking-tight text-foreground"
      >
        <Logo />
      </Link>
      <nav
        aria-label={content.label}
        className="col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:justify-self-center"
      >
        <ul className="grid grid-cols-4 rounded-full border border-white/10 bg-white/[0.03] p-1 shadow-[inset_0_1px_0_rgb(255_255_255/5%)] sm:flex sm:gap-1">
          {LINKS.map(([href, key, Mark]) => {
            const current = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className="nav-tab landing-focus relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[0.7rem] text-foreground-soft transition-colors duration-200 hover:text-foreground aria-[current=page]:bg-white/[0.08] aria-[current=page]:text-foreground sm:flex-row sm:gap-2 sm:px-4 sm:text-sm"
                >
                  <Mark className={`nav-tab-mark size-[18px] ${current ? 'text-accent' : ''}`} />
                  {content[key]}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <AccountMenu />
    </header>
  )
  if (!fixed) return bar
  // Bleeds over the page's own gutter so the blur reaches the edges.
  return (
    <div className="sticky top-0 z-40 -mx-4 -mt-8 mb-2 border-b border-white/[0.07] bg-background/80 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
      {bar}
    </div>
  )
}

/**
 * The account behind one button: a disclosure, not a modal. It closes on
 * Escape (focus back on the button), on a click outside, and when a link in
 * it is followed.
 */
function AccountMenu() {
  const content = useNavContent()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="relative justify-self-end">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((value) => !value)}
        className={`landing-focus flex min-h-11 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors duration-200 ${
          open
            ? 'border-white/40 bg-white/[0.08] text-foreground'
            : 'border-white/20 text-foreground-soft hover:border-white/40 hover:text-foreground'
        }`}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-white/[0.08] text-foreground">
          <PlayerMark className="size-[18px]" />
        </span>
        <span className="hidden sm:inline">{content.account}</span>
        <Chevron
          className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
        <span className="sr-only sm:hidden">{content.account}</span>
      </button>
      <div
        id="account-menu"
        hidden={!open}
        className="account-menu absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(18rem,calc(100vw-2rem))] rounded-md border border-white/12 bg-surface p-1.5 shadow-[0_20px_45px_rgb(0_0_0/45%),inset_0_1px_0_rgb(255_255_255/6%)]"
      >
        {/* A setting, so a row: the name on the left, the switch on the
            right, at its own width. Full width, the white plate was the
            loudest thing on the menu. */}
        <div className="flex items-center justify-between gap-3 py-1.5 pl-3 pr-1.5">
          <span className="text-sm text-foreground-soft">{content.language}</span>
          <LanguageSwitcher className="w-[7.5rem]" />
        </div>
        <div className="mx-3 my-1 h-px bg-white/8" />
        <Link
          href="/account/discord"
          onClick={() => setOpen(false)}
          className="menu-row landing-focus group flex min-h-11 items-center gap-3 rounded-sm px-1.5 text-sm text-foreground-soft transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          <MenuRing>
            <span style={{ color: DISCORD_BLURPLE }} className="flex">
              <DiscordMark className="size-4 shrink-0" />
            </span>
          </MenuRing>
          <span className="flex-1">{content.discord}</span>
          <Chevron className="menu-row-go size-4 -rotate-90 text-foreground-weak" />
        </Link>
        <div className="mx-3 my-1 h-px bg-white/8" />
        <SignOutButton />
      </div>
    </div>
  )
}

type MarkProps = { className?: string }

function Stroke({ className, children }: MarkProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  )
}

/** The stadium seen from the stand: home. */
function HomeMark({ className }: MarkProps) {
  return (
    <Stroke className={className}>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5.5 9v10.5h13V9" />
      <path d="M10 19.5v-5h4v5" />
    </Stroke>
  )
}

/** The tunnel's arches: the queue. */
function QueueMark({ className }: MarkProps) {
  return (
    <Stroke className={className}>
      <path d="M4 20V11a8 8 0 0 1 16 0v9" />
      <path d="M8 20v-8a4 4 0 0 1 8 0v8" />
      <path d="M2.5 20h19" />
    </Stroke>
  )
}

/** A shirt: the squad. */
function SquadMark({ className }: MarkProps) {
  return (
    <Stroke className={className}>
      <path d="M8.5 3.5 12 5l3.5-1.5 5 3-2 4-2-1V20h-9V9.5l-2 1-2-4z" />
    </Stroke>
  )
}

/** A crest: the club. */
function ClubMark({ className }: MarkProps) {
  return (
    <Stroke className={className}>
      <path d="M4.5 4h15v7.5c0 4.5-3.2 7.6-7.5 8.9-4.3-1.3-7.5-4.4-7.5-8.9z" />
      <path d="M9 10.5h6M12 8v6" />
    </Stroke>
  )
}

/** A player's head and shoulders: the account. */
function PlayerMark({ className }: MarkProps) {
  return (
    <Stroke className={className}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </Stroke>
  )
}

function Chevron({ className }: MarkProps) {
  return (
    <Stroke className={className}>
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </Stroke>
  )
}
