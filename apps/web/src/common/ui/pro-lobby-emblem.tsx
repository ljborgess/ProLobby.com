/**
 * The ProLobby emblem: a pentagon — one panel of a ball — with a P cut from
 * angled strokes inside it. Ours, drawn here; it is not and must not become a
 * copy of any game's or league's mark (PRODUCT.md, "Evidence on Hand").
 *
 * Stroke only, one weight, `currentColor`, so it sits as a watermark at any
 * opacity the scene asks for.
 */
export function ProLobbyEmblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={className}>
      <g fill="none" stroke="currentColor" strokeLinejoin="miter" strokeLinecap="square">
        {/* The panel. */}
        <path d="M100 12 186 74 153 176H47L14 74Z" strokeWidth={2.5} />
        <path d="M100 30 168 79 142 158H58L32 79Z" strokeWidth={0.8} opacity={0.5} />
        {/* The P: a stem leaning forward, and a bowl cut at angles. */}
        <path d="M78 150 96 62h38l14 14-8 30-14 12H94" strokeWidth={9} />
      </g>
    </svg>
  )
}
