import { Injectable } from '@nestjs/common'

/**
 * Injectable clock. Production uses the system; tests inject a fake so
 * retry delays are proven by ticking, not by sleeping (flaky twice already).
 */
export abstract class Clock {
  abstract now(): Date
  abstract schedule(delayMs: number, fn: () => void): () => void
}

@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date()
  }

  schedule(delayMs: number, fn: () => void): () => void {
    const handle = setTimeout(fn, delayMs)
    return () => clearTimeout(handle)
  }
}
