'use client'

import Link from 'next/link'
import { useLocale } from '@/common/providers/locale-provider'
import { NOT_FOUND_CONTENT } from '@/content/not-found'
import { StatusScreen } from './status-screen'

/**
 * The 404 (2026-10-29): a ball rolled over the touchline, the pitch corner in
 * hairline. It answers both a route that never existed and one this account
 * may not see (/moderation), so the two read exactly the same.
 */
export function NotFoundView() {
  const { locale } = useLocale()
  const content = NOT_FOUND_CONTENT[locale]

  return (
    <StatusScreen
      code="404"
      title={content.title}
      body={content.body}
      scene={
        <>
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
        </>
      }
    >
      <Link
        href="/"
        className="landing-focus inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-background shadow-[0_8px_20px_rgb(0_0_0/25%)] transition-transform duration-200 hover:scale-[1.04] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        {content.action}
      </Link>
    </StatusScreen>
  )
}
