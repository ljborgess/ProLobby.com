'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/common/ui/logo'

/**
 * The frame the 404 and the error screen share (#296): the logo, the corner
 * of the pitch in hairline, a scene drawn on it, a title and a line of text,
 * and the actions under them. Each screen draws only its own scene.
 */
export function StatusScreen({
  scene,
  code,
  title,
  body,
  alert = false,
  children,
}: {
  /** What happens on the pitch corner: the ball over the line, the ball stopped short. */
  scene: ReactNode
  /** A big number over the title ("404"), decorative. */
  code?: string
  title: string
  body: string
  /** Announce the text at once (an error), instead of waiting to be read. */
  alert?: boolean
  children: ReactNode
}) {
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
        {scene}
      </svg>
      <div role={alert ? 'alert' : undefined} className="flex flex-col items-center gap-3">
        {code && (
          <p
            aria-hidden
            className="font-display text-[clamp(3.5rem,2.5rem+4vw,6rem)] font-light leading-none tracking-[-0.04em] text-foreground-soft tabular-nums"
          >
            {code}
          </p>
        )}
        <h1 className="landing-section-title font-display text-foreground">{title}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-foreground-soft">{body}</p>
      </div>
      {children}
    </main>
  )
}
