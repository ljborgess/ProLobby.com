'use client'

import { useAccountContent } from '@/hooks/use-account-content'

export type ReputationBand = 'good' | 'slow_queue' | 'suspension' | 'ban'

/** The ladder's lines (docs/produto/parametros.md): where a band begins. */
const THRESHOLDS = [25, 40, 55] as const

/** Centre and radius of the dial, in the SVG's own units. */
const CX = 60
const CY = 58
const R = 48

/** A point on the dial for a value 0–100, left (0) to right (100). */
function point(value: number, radius: number): { x: number; y: number } {
  const angle = Math.PI * (1 - value / 100)
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) }
}

/**
 * The account's reputation as an instrument — #208 on the pre-match panel.
 * A half dial from 0 to 100 with the ladder's lines marked, and the number
 * itself large in the display cut. The arc takes the accent only while the
 * reputation is in the good band: green is a positive state in this system,
 * and below 55 the arc goes neutral and the words say what changed.
 *
 * The API decides the band; this only draws it (the thresholds here place
 * the ticks and never decide anything).
 */
export function ReputationGauge({
  reputation,
  band,
  inline = false,
}: {
  reputation: number
  band: ReputationBand
  /** Without the card: mounted inside another scene, smaller. */
  inline?: boolean
}) {
  const content = useAccountContent().reputation
  const value = Math.min(100, Math.max(0, reputation))
  const good = band === 'good'
  const tip = point(value, R)

  return (
    <div
      className={
        inline
          ? 'relative flex items-center gap-3'
          : 'landing-card relative flex items-center gap-5 overflow-hidden rounded-md border border-white/10 bg-surface px-5 py-5'
      }
    >
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={content.valueText(value, content.bands[band])}
        aria-label={content.label}
        className={`relative shrink-0 ${inline ? 'w-24 sm:w-28' : 'w-36 sm:w-40'}`}
      >
        <svg viewBox="0 -10 120 76" aria-hidden className="w-full overflow-visible">
          {/* Track, then the lit stretch drawn over it from 0. */}
          <path
            d={`M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={6}
            strokeLinecap="round"
            className="text-white/8"
          />
          <path
            d={`M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={6}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${value} 100`}
            className={`reputation-gauge-fill ${good ? 'text-accent' : 'text-foreground-soft'}`}
          />
          {THRESHOLDS.map((line) => {
            const inner = point(line, R - 5)
            const outer = point(line, R + 7)
            const label = point(line, R + 13)
            return (
              <g key={line}>
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="currentColor"
                  strokeWidth={0.8}
                  className="text-white/35"
                />
                <text
                  x={label.x}
                  y={label.y + 2}
                  textAnchor="middle"
                  fontSize={6.5}
                  className="fill-foreground-soft tabular-nums"
                >
                  {line}
                </text>
              </g>
            )
          })}
          {/* Where the account stands: a bead on the arc. */}
          <circle
            cx={tip.x}
            cy={tip.y}
            r={4.2}
            className={`reputation-gauge-bead ${good ? 'fill-accent' : 'fill-foreground'}`}
          />
        </svg>
        <p className="absolute inset-x-0 bottom-0 flex items-baseline justify-center gap-0.5">
          <span
            className={`font-display ${inline ? 'text-2xl' : 'text-3xl'} font-light leading-none tracking-tight text-foreground tabular-nums`}
          >
            {value}
          </span>
          <span className="text-xs text-foreground-soft">/100</span>
        </p>
      </div>

      <div className={`flex min-w-0 flex-col ${inline ? 'max-w-44 gap-0.5' : 'gap-1.5'}`}>
        <p className={`${inline ? 'text-xs' : 'text-sm'} text-foreground-soft`}>{content.label}</p>
        <p
          className={`${inline ? 'text-sm' : 'text-base'} font-medium ${good ? 'text-accent' : 'text-foreground'}`}
        >
          {content.bands[band]}
        </p>
        {/* Inline, the good band needs no explaining; under 55 the line stays. */}
        {(!inline || !good) && (
          <p
            className={`${inline ? 'text-[0.7rem] leading-snug' : 'text-xs leading-relaxed'} text-foreground-soft`}
          >
            {good ? content.howItMoves : content.slowQueue}
          </p>
        )}
      </div>
    </div>
  )
}
