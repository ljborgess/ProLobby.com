import { afterEach, describe, expect, it, vi } from 'vitest'
import { every } from './clock'

class FakeWorker {
  static last: FakeWorker | undefined
  onmessage: (() => void) | null = null
  onerror: (() => void) | null = null
  posted: unknown[] = []
  terminated = false
  constructor() {
    FakeWorker.last = this
  }
  postMessage(message: unknown) {
    this.posted.push(message)
  }
  terminate() {
    this.terminated = true
  }
}

describe('every (#298)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('ticks from the worker, and stops it', () => {
    vi.stubGlobal('Worker', FakeWorker)
    const tick = vi.fn()
    const stop = every(2000, tick)

    expect(FakeWorker.last!.posted).toEqual([2000])
    FakeWorker.last!.onmessage!()
    expect(tick).toHaveBeenCalledTimes(1)
    stop()
    expect(FakeWorker.last!.terminated).toBe(true)
  })

  it('falls back to the main thread when the worker will not load', () => {
    vi.useFakeTimers()
    vi.stubGlobal('Worker', FakeWorker)
    const tick = vi.fn()
    const stop = every(1000, tick)

    FakeWorker.last!.onerror!()
    vi.advanceTimersByTime(3000)
    expect(tick).toHaveBeenCalledTimes(3)
    stop()
    vi.advanceTimersByTime(3000)
    expect(tick).toHaveBeenCalledTimes(3)
  })

  it('uses the main thread where there is no Worker', () => {
    vi.useFakeTimers()
    vi.stubGlobal('Worker', undefined)
    const tick = vi.fn()
    const stop = every(1000, tick)

    vi.advanceTimersByTime(2000)
    expect(tick).toHaveBeenCalledTimes(2)
    stop()
  })
})
