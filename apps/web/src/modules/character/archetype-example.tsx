/**
 * The example next to the upload — a drawing, not a real print: a real one
 * would carry a real person's gamertag. Marks the two things the check reads,
 * the ✓ beside the active archetype and the gamertag under the card.
 */
export function ArchetypeExample({ caption, gamertag }: { caption: string; gamertag: string }) {
  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox="0 0 320 180"
        role="img"
        aria-label={caption}
        className="w-full rounded-md border border-white/10 bg-surface"
      >
        <rect x="16" y="24" width="84" height="132" rx="8" fill="currentColor" opacity="0.12" />
        <circle cx="58" cy="70" r="20" fill="currentColor" opacity="0.2" />
        <text x="58" y="128" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">
          MAESTRO
        </text>
        <text x="58" y="143" textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.8">
          ◉ {gamertag}
        </text>
        <rect
          x="18"
          y="133"
          width="80"
          height="16"
          rx="4"
          fill="none"
          className="stroke-accent"
          strokeWidth="1.5"
        />

        <text x="120" y="52" fontSize="20" fontWeight="700" fill="currentColor">
          MAESTRO
        </text>
        <circle cx="232" cy="45" r="8" className="fill-accent" />
        <path d="M228 45l3 3 5-6" className="stroke-background" strokeWidth="2" fill="none" />
        <rect
          x="116"
          y="30"
          width="130"
          height="28"
          rx="6"
          fill="none"
          className="stroke-accent"
          strokeWidth="1.5"
        />

        <rect x="120" y="76" width="160" height="6" rx="3" fill="currentColor" opacity="0.15" />
        <rect x="120" y="90" width="130" height="6" rx="3" fill="currentColor" opacity="0.15" />
        <rect x="120" y="104" width="145" height="6" rx="3" fill="currentColor" opacity="0.15" />
      </svg>
      <figcaption className="text-xs leading-snug text-foreground-soft">{caption}</figcaption>
    </figure>
  )
}
