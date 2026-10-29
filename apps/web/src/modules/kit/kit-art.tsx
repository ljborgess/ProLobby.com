import { useId } from 'react'
import type { CrestShape, Kit, KitColor, KitPattern } from '@prolobby/types'

/**
 * The kit palette (Kit Lab, 2026-10-29). Kit colours live only inside the
 * shirt and the crest: they are the club's, never a state of the interface,
 * so none of them ever paints a button, a border or a message. `ink` is the
 * colour that reads on top (number, initials), checked against `fill`.
 */
export const KIT_SWATCH: Record<KitColor, { fill: string; ink: string }> = {
  white: { fill: '#f2f4f8', ink: '#0d1526' },
  black: { fill: '#14161b', ink: '#f2f4f8' },
  red: { fill: '#d42a3c', ink: '#ffffff' },
  claret: { fill: '#7b1f3f', ink: '#ffffff' },
  orange: { fill: '#f0701f', ink: '#14161b' },
  yellow: { fill: '#f4d03a', ink: '#14161b' },
  green: { fill: '#1d7f47', ink: '#ffffff' },
  sky: { fill: '#72b6ec', ink: '#0d1526' },
  blue: { fill: '#2050d4', ink: '#ffffff' },
  navy: { fill: '#162550', ink: '#ffffff' },
  purple: { fill: '#5c2c88', ink: '#ffffff' },
  grey: { fill: '#8c95a5', ink: '#14161b' },
}

/** The shirt, front on, in a 48-unit box: the same cut as the lockers' kit. */
const SHIRT = 'M17 7l7 3 7-3 11 6-4 9-4-2v22H14V20l-4 2-4-9z'

/** What the pattern adds over the primary colour, in the shirt's box. */
function PatternInk({ pattern, color }: { pattern: KitPattern; color: string }) {
  switch (pattern) {
    case 'stripes':
      return (
        <g fill={color}>
          {[11, 17, 23, 29, 35].map((x) => (
            <rect key={x} x={x} y="0" width="3" height="48" />
          ))}
        </g>
      )
    case 'hoops':
      return (
        <g fill={color}>
          {[14, 22, 30, 38].map((y) => (
            <rect key={y} x="0" y={y} width="48" height="4" />
          ))}
        </g>
      )
    case 'halves':
      return <rect x="24" y="0" width="24" height="48" fill={color} />
    case 'sash':
      return <path d="M6 10L14 6 44 40 34 46z" fill={color} />
    case 'plain':
      return null
  }
}

/**
 * The club's shirt, front on: primary, the pattern in the secondary, the
 * collar and cuffs trimmed in the secondary, the crest over the heart.
 */
export function KitShirt({
  kit,
  initials,
  className = '',
}: {
  kit: Kit
  initials: string
  className?: string
}) {
  const clip = useId()
  const sheen = useId()
  const primary = KIT_SWATCH[kit.primary]
  const secondary = KIT_SWATCH[kit.secondary]

  return (
    <svg viewBox="0 0 48 48" aria-hidden className={`overflow-visible ${className}`}>
      <defs>
        <clipPath id={clip}>
          <path d={SHIRT} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="48" height="48" fill={primary.fill} />
        <PatternInk pattern={kit.pattern} color={secondary.fill} />
        {/* Fabric: a soft light from the left shoulder. */}
        <rect width="48" height="48" fill={`url(#${sheen})`} opacity="0.5" />
      </g>
      <defs>
        <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path
        d={SHIRT}
        fill="none"
        stroke="#000000"
        strokeOpacity="0.35"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      {/* Collar and cuffs in the secondary colour. */}
      <path
        d="M17 7l7 3 7-3"
        fill="none"
        stroke={secondary.fill}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M6 13l4 9M42 13l-4 9"
        fill="none"
        stroke={secondary.fill}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <g transform="translate(27.4 13.2) scale(0.16)">
        <CrestMark kit={kit} initials={initials} />
      </g>
    </svg>
  )
}

const CREST_PATH: Record<CrestShape, string> = {
  shield: 'M4 4h32v14c0 10-7 17-16 20C11 35 4 28 4 18z',
  round: 'M20 2a18 18 0 1 1 0 36a18 18 0 1 1 0-36z',
  diamond: 'M20 1l19 19-19 19L1 20z',
}

/** The crest drawn in a 40-unit box, for nesting in other drawings. */
function CrestMark({ kit, initials }: { kit: Kit; initials: string }) {
  const field = KIT_SWATCH[kit.secondary]
  const rim = KIT_SWATCH[kit.primary]
  return (
    <g>
      <path d={CREST_PATH[kit.crest]} fill={field.fill} stroke={rim.fill} strokeWidth="2.5" />
      <path
        d={CREST_PATH[kit.crest]}
        fill="none"
        stroke={field.ink}
        strokeOpacity="0.35"
        strokeWidth="0.8"
        transform="translate(20 20) scale(0.82) translate(-20 -20)"
      />
      <text
        x="20"
        y={kit.crest === 'shield' ? 22.5 : 24}
        textAnchor="middle"
        fontSize={initials.length > 2 ? 11 : 13}
        fontWeight={700}
        letterSpacing="0.5"
        className="font-numeric"
        fill={field.ink}
      >
        {initials}
      </text>
    </g>
  )
}

/** The crest on its own, at any size. */
export function Crest({
  kit,
  initials,
  className = '',
}: {
  kit: Kit
  initials: string
  className?: string
}) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={`overflow-visible ${className}`}>
      <CrestMark kit={kit} initials={initials} />
    </svg>
  )
}

/** "Várzea Futebol Clube" → "VFC"; "Lusitana" → "LU". Letters and digits of any script, up to three. */
export function initialsOf(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0]!.slice(0, 2)
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
}
