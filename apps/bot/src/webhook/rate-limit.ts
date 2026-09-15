/**
 * Global limiter — every request to POST /events comes from the API container
 * (ADR-009), so a per-IP bucket would be one bucket in disguise.
 *
 * Sized for the legitimate peak: 10 simultaneous lobbies (RNF-004) ×
 * (3 channels + ping + message) = 50 events, with headroom for retries
 * (RF-058) to land in the same minute → 120 / 60s.
 */
export const WEBHOOK_RATE_LIMIT_MAX = 120
export const WEBHOOK_RATE_LIMIT_WINDOW_MS = 60_000

/** 64 KiB. A lobby.closed with 22 uuids is a few kilobytes; this is memory protection. */
export const WEBHOOK_BODY_LIMIT = '64kb'

export type Clock = { now(): Date }

export class SlidingWindowLimiter {
  private hits: number[] = []

  constructor(
    private readonly clock: Clock,
    private readonly max = WEBHOOK_RATE_LIMIT_MAX,
    private readonly windowMs = WEBHOOK_RATE_LIMIT_WINDOW_MS,
  ) {}

  /** @returns true if the request is allowed. */
  allow(): boolean {
    const now = this.clock.now().getTime()
    this.hits = this.hits.filter((at) => now - at < this.windowMs)
    if (this.hits.length >= this.max) {
      return false
    }
    this.hits.push(now)
    return true
  }
}
