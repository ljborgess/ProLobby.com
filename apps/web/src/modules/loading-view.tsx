'use client'

import { useLocale } from '@/common/providers/locale-provider'
import { LOADING_CONTENT } from '@/content/loading'

/**
 * The wait between a click and a signed-in route (#296): the shape of the
 * screen coming, in hairlines — a title bar and three cards — not a spinner.
 * It breathes only when the visitor allows motion.
 */
export function LoadingView() {
  const { locale } = useLocale()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      {/* The live region is inside <main>, which keeps its landmark. */}
      <p role="status" aria-live="polite" className="sr-only">
        {LOADING_CONTENT[locale].label}
      </p>
      <div aria-hidden className="flex flex-col gap-6 motion-safe:animate-pulse">
        <div className="h-4 w-28 rounded-full bg-white/[0.06]" />
        <div className="h-9 w-2/3 max-w-sm rounded-md bg-white/[0.08]" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <div key={card} className="h-36 rounded-md border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      </div>
    </main>
  )
}
