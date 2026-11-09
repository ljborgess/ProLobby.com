'use client'

import Link from 'next/link'
import { useLocale } from '@/common/providers/locale-provider'
import { Logo } from '@/common/ui/logo'
import { ERROR_CONTENT } from '@/content/error'

/**
 * The error screen (#296), in the 404's language: the same pitch corner, the
 * ball stopped short of the line. It says nothing about what broke — no
 * message, no digest — only that the person can try again.
 */
export function ErrorView({ retry }: { retry: () => void }) {
  const { locale } = useLocale()
  const content = ERROR_CONTENT[locale]

  return (
    <main className="relative flex min-h-svh flex-1 flex-col items-center justify-center gap-8 overflow-x-clip px-4 py-16 text-center">
      <Link
        href="/"
        className="landing-focus absolute left-4 top-6 rounded-full font-display text-base font-semibold tracking-tight text-foreground sm:left-8"
      >
        <Logo />
      </Link>
      <svg viewBox="0 0 240 150" aria-hidden className="w-[min(78vw,22rem)] overflow-visible">
        <g fill="none" stroke="rgb(255 255 255 / 22%)" strokeWidth={1.2}>
          <path d="M20 130H200V20" />
          <path d="M200 112a18 18 0 0 1-18 18" />
          <path d="M200 40h-34v52h34" />
        </g>
        <path
          d="M60 122c20-8 46-20 74-38"
          fill="none"
          className="stroke-accent"
          strokeOpacity={0.45}
          strokeWidth={1.2}
          strokeDasharray="3 5"
        />
        {/* Stopped short of the line, a cross where it should have gone. */}
        <circle cx="138" cy="82" r="9" className="fill-foreground" />
        <path
          d="M176 60l16 16M192 60l-16 16"
          fill="none"
          className="stroke-danger"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </svg>
      <div role="alert" className="flex flex-col items-center gap-3">
        <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-foreground-soft">{content.body}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="landing-focus inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-background shadow-[0_8px_20px_rgb(0_0_0/25%)] transition-transform duration-200 hover:scale-[1.04] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
        >
          {content.retry}
        </button>
        <Link
          href="/"
          className="landing-focus inline-flex min-h-11 items-center rounded-full px-4 text-sm text-foreground-soft transition-colors hover:text-foreground"
        >
          {content.home}
        </Link>
      </div>
    </main>
  )
}
