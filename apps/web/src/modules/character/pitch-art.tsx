import type { CharacterCategory } from '@/content/character'

/**
 * The corner brackets of the auth panel's readout, at card size: the frame
 * that says "this was read and locked in". Accent when set, faint until.
 */
export function Brackets({ lit = true }: { lit?: boolean }) {
  const corner = `pointer-events-none absolute size-2.5 ${lit ? 'border-accent/70' : 'border-white/25'}`
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <span className={`${corner} left-1.5 top-1.5 border-l border-t`} />
      <span className={`${corner} right-1.5 top-1.5 border-r border-t`} />
      <span className={`${corner} bottom-1.5 left-1.5 border-b border-l`} />
      <span className={`${corner} bottom-1.5 right-1.5 border-b border-r`} />
    </span>
  )
}

/** Where each category stands, on a pitch drawn attacking to the right. */
const ZONE: Record<CharacterCategory, { x: number; y: number }> = {
  goalkeeper: { x: 5, y: 20 },
  defender: { x: 16, y: 20 },
  midfielder: { x: 30, y: 20 },
  winger: { x: 43, y: 8 },
  striker: { x: 52, y: 20 },
}

/**
 * A place on a small pitch, drawn the Quadro da Fila way: a solid disc when
 * set, a faint ring otherwise. Stroke, never fill, and always quieter than
 * the text beside it.
 */
export function PositionPitch({
  category,
  marker,
}: {
  category: CharacterCategory
  marker: 'set' | 'empty'
}) {
  const { x, y } = ZONE[category]
  return (
    <svg
      viewBox="0 0 60 40"
      aria-hidden
      className="h-14 w-auto self-start text-white/20 sm:h-auto sm:w-full"
    >
      <g fill="none" stroke="currentColor" strokeWidth={0.5}>
        <rect x="1" y="1" width="58" height="38" rx="1.5" />
        <path d="M30 1v38" />
        <circle cx="30" cy="20" r="5" />
        <rect x="1" y="11" width="8" height="18" />
        <rect x="51" y="11" width="8" height="18" />
      </g>
      {marker === 'set' ? (
        <>
          <circle cx={x} cy={y} r="5" className="fill-accent/20" />
          <circle cx={x} cy={y} r="2.6" className="fill-accent" />
        </>
      ) : (
        <circle cx={x} cy={y} r="2.8" fill="none" strokeWidth={0.7} className="stroke-white/40" />
      )}
    </svg>
  )
}
