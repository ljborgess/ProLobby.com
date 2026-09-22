/**
 * The drawn background behind the signed-in account screens.
 *
 * Deliberately quieter than the auth panel's readout and much quieter than the
 * landing: these are screens where someone is completing a task, not being
 * persuaded. No radar, no scanlines, no rotating halo — a wash of light, the
 * woven texture, and the pitch grid receding at the very bottom, all under a
 * scrim. Brand lives in the details here, not in the scenery.
 */
export function AccountBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="landing-glow absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,_var(--color-accent-strong)_0%,_transparent_70%)]" />
      <div className="landing-floor absolute inset-x-0 bottom-0 h-56 opacity-35" />
      <div className="landing-weave absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,_transparent_0%,_var(--color-bg)_100%)]" />
      <div className="absolute inset-0 bg-background/45" />
    </div>
  )
}
