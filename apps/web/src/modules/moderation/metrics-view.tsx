'use client'

import { useEffect, useState } from 'react'
import { useModerationToolsContent } from '@/hooks/use-moderation-tools-content'
import type { Metrics, ToolsSource } from './tools'

/**
 * The closed beta's numbers (#314): six cards for the exit criteria — current
 * value against the target, a check when it is met — and three for the success
 * metrics, each with its band. A number nobody measured yet says so, in words,
 * never as a 0.
 */
export function MetricsView({ source }: { source: ToolsSource }) {
  const content = useModerationToolsContent()
  const [metrics, setMetrics] = useState<Metrics | 'error' | null>(null)

  useEffect(() => {
    let alive = true
    source
      .metrics()
      .then((value) => alive && setMetrics(value))
      .catch(() => alive && setMetrics('error'))
    return () => {
      alive = false
    }
  }, [source])

  if (metrics === null) return <p className="text-sm text-foreground-soft">…</p>
  if (metrics === 'error')
    return <p className="text-sm text-foreground-soft">{content.loadError}</p>

  return (
    <div className="flex flex-col gap-8">
      <section aria-label={content.metrics.beta} className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">{content.metrics.beta}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.beta.map((metric) => (
            <li
              key={metric.key}
              className="flex flex-col gap-1 rounded-md border border-white/10 bg-surface p-4"
            >
              <span className="text-xs text-foreground-soft">{metric.label}</span>
              <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                {metric.value === null ? (
                  <span className="text-base font-normal text-foreground-soft">
                    {content.noData}
                  </span>
                ) : (
                  metric.value
                )}
              </span>
              <span className="flex items-center gap-2 text-xs text-foreground-soft">
                {content.metrics.target} {metric.target}
                {metric.met ? (
                  <span className="text-accent" role="img" aria-label={content.metrics.met}>
                    ✓
                  </span>
                ) : (
                  <span className="sr-only">{content.metrics.notMet}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={content.metrics.success} className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">{content.metrics.success}</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {metrics.success.map((metric) => (
            <li
              key={metric.key}
              className="flex flex-col gap-1 rounded-md border border-white/10 bg-surface p-4"
            >
              <span className="text-xs text-foreground-soft">{metric.label}</span>
              <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                {metric.value === null ? (
                  <span className="text-base font-normal text-foreground-soft">
                    {content.noData}
                  </span>
                ) : (
                  metric.value
                )}
              </span>
              <span className="text-xs text-foreground-soft">
                {metric.band ? content.metrics.bands[metric.band] : content.metrics.noBand}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
