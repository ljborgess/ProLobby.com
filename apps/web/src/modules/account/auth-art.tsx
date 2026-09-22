/**
 * The art beside the auth forms: a match readout, drawn.
 *
 * **Why no photography.** Screenshots and match footage from EA FC are EA's,
 * and shipping them out of `public/` would be republishing them — so the depth
 * here comes from layers we author: a pitch in perspective, a swept radar, a
 * grid, floodlight beams, scanlines, corner brackets. It also happens to suit
 * the product better than a borrowed still would: this is a matchmaking
 * platform, and what it has to sell is the readout, not the match.
 *
 * Every moving part has a `prefers-reduced-motion` no-op in globals.css
 * (RNF-015), and the whole panel is `aria-hidden` — it says nothing the copy
 * beside it does not.
 */
export function AuthArt() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Depth: two wide washes, the accent from above and a trace of gold
          low and to one side, so the panel is not one flat colour. */}
      <div className="landing-glow absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_55%_8%,_var(--color-accent-strong)_0%,_transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_18%_78%,_var(--color-gold)_0%,_transparent_70%)] opacity-[0.09]" />

      {/* Floodlights over the pitch. */}
      <div className="landing-beam absolute -top-10 left-[18%] h-[62%] w-40 blur-2xl" />
      <div
        className="landing-beam absolute -top-10 right-[16%] h-[54%] w-32 blur-2xl"
        style={{ animationDelay: '-4s' }}
      />

      {/* The readout itself: a swept radar over concentric rings, sitting
          where the eye lands first. */}
      <div className="absolute left-1/2 top-[26%] size-[26rem] -translate-x-1/2 -translate-y-1/2">
        <div className="landing-radar absolute inset-0" />
        <RadarRings />
      </div>

      {/* A pitch receding to the horizon, laid under everything. The
          container is taller than the slice that ends up visible: rotating it
          back on X foreshortens it hard, and a short box would leave the
          markings squashed into a band at the bottom edge. */}
      <div className="absolute inset-x-0 bottom-0 h-[78%] [perspective:760px]">
        <div className="absolute inset-0 origin-bottom [transform:rotateX(61deg)_scale(1.35)]">
          <PitchGrid />
        </div>
      </div>

      <CornerBrackets />

      <div className="landing-scanlines absolute inset-0 opacity-70" />

      {/* Settles the whole thing back down so the copy on top stays first.
          Light-handed at the bottom on purpose: the pitch lives there, and a
          heavy fade buries it. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_40%,_transparent_0%,_var(--color-bg)_100%)]" />
      <div className="absolute inset-0 bg-background/25" />
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-b from-transparent to-background/55" />
    </div>
  )
}

/** Range rings and crosshairs under the sweep. */
function RadarRings() {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 size-full">
      <g fill="none" stroke="currentColor" className="text-accent">
        <circle cx="100" cy="100" r="96" strokeWidth="0.4" opacity="0.28" />
        <circle cx="100" cy="100" r="70" strokeWidth="0.4" opacity="0.22" />
        <circle cx="100" cy="100" r="44" strokeWidth="0.4" opacity="0.18" />
        <circle cx="100" cy="100" r="18" strokeWidth="0.6" opacity="0.35" />
        <line x1="4" y1="100" x2="196" y2="100" strokeWidth="0.3" opacity="0.16" />
        <line x1="100" y1="4" x2="100" y2="196" strokeWidth="0.3" opacity="0.16" />
      </g>
      {/* Contacts on the sweep — five, one per position category. */}
      <g className="text-accent" fill="currentColor">
        <circle cx="128" cy="62" r="2" opacity="0.9" />
        <circle cx="72" cy="86" r="1.6" opacity="0.7" />
        <circle cx="146" cy="118" r="1.6" opacity="0.6" />
        <circle cx="64" cy="134" r="1.4" opacity="0.5" />
        <circle cx="104" cy="152" r="1.8" opacity="0.75" />
      </g>
    </svg>
  )
}

/** The pitch, in plan, meant to be tilted by the wrapper above. */
function PitchGrid() {
  return (
    <svg viewBox="0 0 120 80" preserveAspectRatio="none" className="size-full">
      <defs>
        <linearGradient id="auth-pitch-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="55%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="1" />
        </linearGradient>
        <mask id="auth-pitch-mask">
          <rect width="120" height="80" fill="url(#auth-pitch-fade)" />
        </mask>
      </defs>
      <g
        mask="url(#auth-pitch-mask)"
        fill="none"
        stroke="currentColor"
        className="text-accent"
        strokeWidth="0.35"
        opacity="0.8"
      >
        {/* Grid. */}
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="80" opacity="0.35" />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 10} x2="120" y2={i * 10} opacity="0.35" />
        ))}
        {/* Markings, brighter than the grid they sit on. */}
        <rect x="6" y="6" width="108" height="68" strokeWidth="0.6" />
        <line x1="60" y1="6" x2="60" y2="74" strokeWidth="0.6" />
        <circle cx="60" cy="40" r="11" strokeWidth="0.6" />
        <rect x="6" y="24" width="15" height="32" strokeWidth="0.6" />
        <rect x="99" y="24" width="15" height="32" strokeWidth="0.6" />
      </g>
    </svg>
  )
}

/** Framing marks, the way a targeting overlay frames its view. */
function CornerBrackets() {
  const corner = 'absolute size-10 border-accent/35'
  return (
    <>
      <div className={`${corner} left-8 top-8 border-l border-t`} />
      <div className={`${corner} right-8 top-8 border-r border-t`} />
      <div className={`${corner} bottom-8 left-8 border-b border-l`} />
      <div className={`${corner} bottom-8 right-8 border-b border-r`} />
    </>
  )
}
