/**
 * The hero's drawn scene: a pairing network.
 *
 * Not the auth panel's radar again, on purpose — the two screens say different
 * things. What the hero has to say is that two sides get built out of people
 * who each arrived alone, so this is a graph: nodes waiting on the left and
 * right, edges lighting up across the middle as pairs are made. A pulse
 * travels each edge, staggered per edge, so the picture reads as matching in
 * progress rather than a diagram that blinks.
 *
 * The box is deliberately wide (3:1) and drawn with `slice`. Stretching it to
 * fit instead — `preserveAspectRatio="none"` — is the obvious move and the
 * wrong one: it squashes every node from a circle into an ellipse. A wide box
 * that crops a little off the top and bottom keeps them round.
 *
 * Drawn, like everything else on this page: EA's art is EA's. Every animation
 * has a `prefers-reduced-motion` no-op in globals.css (RNF-015), and the whole
 * thing is decorative, hence `aria-hidden`.
 */

/** Two banks of waiting players, left and right of the queue. */
const LEFT = [
  { x: 34, y: 24 },
  { x: 20, y: 46 },
  { x: 42, y: 66 },
  { x: 26, y: 82 },
]
const RIGHT = [
  { x: 266, y: 26 },
  { x: 280, y: 48 },
  { x: 258, y: 68 },
  { x: 274, y: 84 },
]
/** The hub every pair is routed through — the queue itself. */
const HUB = { x: 150, y: 52 }

const NODES = [...LEFT, ...RIGHT]

export function PairingNetwork({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 100"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
    >
      <g stroke="currentColor" fill="none" className="text-accent">
        {/* Resting lines: the topology, always there, barely lit. */}
        {NODES.map((node) => (
          <line
            key={`base-${node.x}-${node.y}`}
            x1={node.x}
            y1={node.y}
            x2={HUB.x}
            y2={HUB.y}
            strokeWidth="0.4"
            opacity="0.18"
          />
        ))}

        {/* The pulses, one per edge, each starting at its own moment. */}
        {NODES.map((node, index) => (
          <line
            key={`pulse-${node.x}-${node.y}`}
            className="landing-edge"
            x1={node.x}
            y1={node.y}
            x2={HUB.x}
            y2={HUB.y}
            strokeWidth="1.1"
            strokeLinecap="round"
            style={{ '--landing-delay': `${index * 0.55}s` } as React.CSSProperties}
          />
        ))}
      </g>

      <g fill="currentColor" className="text-accent">
        {NODES.map((node, index) => (
          <circle
            key={`node-${node.x}-${node.y}`}
            className="landing-node"
            cx={node.x}
            cy={node.y}
            r="2.2"
            style={{ '--landing-delay': `${index * 0.4}s` } as React.CSSProperties}
          />
        ))}
      </g>

      {/* The hub: rings rather than a dot, so it reads as the place the others
          are routed through and not as one more player. */}
      <g className="text-accent">
        <circle
          cx={HUB.x}
          cy={HUB.y}
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.45"
        />
        <circle
          cx={HUB.x}
          cy={HUB.y}
          r="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          opacity="0.22"
        />
        <circle cx={HUB.x} cy={HUB.y} r="2.4" fill="currentColor" opacity="0.85" />
      </g>
    </svg>
  )
}
