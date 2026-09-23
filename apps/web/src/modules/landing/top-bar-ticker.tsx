import type { LandingContent } from '@/content/landing'

/**
 * The rotating badge in the top bar — user reference: a season/day counter
 * pill from another game's site. ProLobby has no season and no launch date
 * (docs/negocio/04-lancamento.md decides neither yet), so putting a number
 * like that here would be a fabricated claim on a public page — the same
 * reason `facts` above holds no invented traction.
 *
 * What it shows instead: the same real, already-decided numbers as the
 * facts strip lower on the page (`content.facts`) — 5 position categories,
 * 30s to confirm, 11v11, pt/es — but in `topBar.ticker`'s own short wording:
 * `facts.items`'s labels ("categorias de posição", "pra confirmar a fila")
 * are sized for a full-width strip, not a small pill.
 * Hidden below `md`: four rotating lines competing with "Entrar"/"Criar
 * conta" for a phone-width top bar is not worth the pixels.
 */
export function TopBarTicker({ items }: { items: LandingContent['topBar']['ticker'] }) {
  return (
    <div
      className="landing-ticker hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 md:flex"
      aria-hidden
    >
      <span className="landing-ticker-icon flex size-4 shrink-0 items-center justify-center text-accent">
        <svg viewBox="0 0 24 24" fill="none" className="size-4">
          <path
            d="M12 2 4 5v6c0 5 3.4 8.7 8 9 4.6-.3 8-4 8-9V5l-8-3Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="m9 12 2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="landing-ticker-track relative h-4 min-w-[110px] overflow-hidden text-xs">
        {items.map((item, index) => (
          <span
            key={`${item.value}-${item.label}`}
            className="landing-ticker-item absolute inset-0 flex items-center gap-1 whitespace-nowrap text-foreground-soft"
            style={{ animationDelay: `${index * -(TICKER_CYCLE_S / items.length)}s` }}
          >
            <strong className="font-semibold text-foreground">{item.value}</strong>
            {item.label}
          </span>
        ))}
      </span>
    </div>
  )
}

/**
 * Total loop length in seconds. Every item's animation is the same
 * `landing-ticker-cycle` keyframe, offset by a negative delay of one slot —
 * the standard CSS-only carousel trick: one shared timeline, no JS interval,
 * no layout shift, and it never drifts out of sync with itself.
 */
export const TICKER_CYCLE_S = 12
