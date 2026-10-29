'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { Logo } from '@/common/ui/logo'
import { useNavContent } from '@/hooks/use-nav-content'
import { SignOutButton } from './sign-out-button'

const LINKS = [
  ['/verifications', 'home'],
  ['/queue', 'queue'],
  ['/account/character', 'squad'],
  ['/account/club', 'club'],
] as const

/**
 * The one header behind the login (audit of 2026-10-28): before it, four
 * screens had four headers, "back" links named a place they did not go, and
 * signing out only existed on the home. Same place, same menu, on every screen.
 */
export function AppHeader({ className = '', inert }: { className?: string; inert?: boolean }) {
  const content = useNavContent()
  const pathname = usePathname()

  return (
    <header
      inert={inert}
      className={`mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 ${className}`}
    >
      <Link
        href="/verifications"
        aria-label={content.homeLabel}
        className="landing-focus inline-flex min-h-11 items-center rounded-full font-display text-base font-semibold tracking-tight text-foreground"
      >
        <Logo />
      </Link>
      <nav aria-label={content.label} className="order-last w-full sm:order-none sm:w-auto">
        <ul className="-mx-3 flex gap-1 sm:mx-0">
          {LINKS.map(([href, key]) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={pathname === href ? 'page' : undefined}
                className="landing-focus inline-flex min-h-11 items-center rounded-full px-3 text-sm text-foreground-soft transition-colors duration-200 hover:text-foreground aria-[current=page]:bg-white/[0.07] aria-[current=page]:text-foreground"
              >
                {content[key]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <SignOutButton />
      </div>
    </header>
  )
}
