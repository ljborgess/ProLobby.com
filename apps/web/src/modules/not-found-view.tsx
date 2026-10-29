'use client'

import Link from 'next/link'
import { useLocale } from '@/common/providers/locale-provider'
import { Logo } from '@/common/ui/logo'
import { NOT_FOUND_CONTENT } from '@/content/not-found'

/**
 * The 404 (2026-10-29): a ball rolled over the touchline, the pitch corner in
 * hairline. It answers both a route that never existed and one this account
 * may not see (/moderation), so the two read exactly the same.
 */
export function NotFoundView() {
  const { locale } = useLocale()
  const content = NOT_FOUND_CONTENT[locale]

  return (
    <main className="relative flex min-h-svh flex-1 flex-col items-center justify-center gap-8 overflow-x-clip px-4 py-16 text-center">
      <Link
        href="/"
        className="landing-focus absolute left-4 top-6 rounded-full font-display text-base font-semibold tracking-tight text-foreground sm:left-8"
      >
        <Logo />
      </Link>
      <svg viewBox="0 0 240 150" aria-hidden className="w-[min(78vw,22rem)] overflow-visible">
        {/* The corner of the pitch: touchline, goal line, the corner arc. */}
        <g fill="none" stroke="rgb(255 255 255 / 22%)" strokeWidth={1.2}>
          <path d="M20 130H200V20" />
          <path d="M200 112a18 18 0 0 1-18 18" />
          <path d="M200 40h-34v52h34" />
        </g>
        {/* The ball, out over the line, and the trail it left. */}
        <path
          d="M120 122c20-8 46-20 74-38"
          fill="none"
          className="stroke-accent"
          strokeOpacity={0.45}
          strokeWidth={1.2}
          strokeDasharray="3 5"
        />
        <g className="not-found-ball">
          <circle cx="214" cy="74" r="9" className="fill-foreground" />
          <path d="M214 68l4 3-1.5 5h-5l-1.5-5z" className="fill-background" opacity={0.85} />
        </g>
      </svg>
      <div className="flex flex-col items-center gap-3">
        <p
          aria-hidden
          className="font-display text-[clamp(3.5rem,2.5rem+4vw,6rem)] font-light leading-none tracking-[-0.04em] text-foreground-soft tabular-nums"
        >
          404
        </p>
        <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-foreground-soft">{content.body}</p>
      </div>
      <Link
        href="/"
        className="landing-focus inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-background shadow-[0_8px_20px_rgb(0_0_0/25%)] transition-transform duration-200 hover:scale-[1.04] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        {content.action}
      </Link>
    </main>
  )
}
