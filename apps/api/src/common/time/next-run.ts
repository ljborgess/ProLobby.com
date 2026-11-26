/**
 * When a polling job next has work to do (#333). A cron tick that queries for
 * nothing keeps the Neon compute awake, and its hibernation is why ADR-009
 * picked it: so a job skips its ticks until the earliest deadline it knows,
 * and finds anything newer at `capMs` at the latest.
 */
export class NextRun {
  private at = 0
  private wakes = 0

  due(now: number = Date.now()): boolean {
    return now >= this.at
  }

  /** Taken before looking for work: a wake after it keeps the job up. */
  mark(): number {
    return this.wakes
  }

  /**
   * Sleep until `next` (null: nothing pending), never past `capMs` from now.
   * Refused when a wake came after `mark`: that work may not have been seen.
   */
  sleepUntil(next: Date | null, capMs: number, now: number = Date.now(), mark = this.wakes): void {
    if (mark !== this.wakes) return
    this.at = Math.min(next?.getTime() ?? Infinity, now + capMs)
  }

  /** New work may exist: run on the next tick. */
  wake(): void {
    this.wakes++
    this.at = 0
  }
}
