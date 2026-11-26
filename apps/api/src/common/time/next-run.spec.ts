import { NextRun } from './next-run'

describe('NextRun (#333)', () => {
  const HOUR = 60 * 60 * 1000

  it('is due until told to sleep', () => {
    expect(new NextRun().due(0)).toBe(true)
  })

  it('sleeps until the next deadline, and is due from it on', () => {
    const next = new NextRun()
    next.sleepUntil(new Date(1000 + HOUR), 6 * HOUR, 1000)
    expect(next.due(1000 + HOUR - 1)).toBe(false)
    expect(next.due(1000 + HOUR)).toBe(true)
  })

  it('never sleeps past the cap, with or without a deadline', () => {
    const next = new NextRun()
    next.sleepUntil(new Date(100 * HOUR), 6 * HOUR, 0)
    expect(next.due(6 * HOUR)).toBe(true)
    next.sleepUntil(null, 6 * HOUR, 0)
    expect(next.due(6 * HOUR - 1)).toBe(false)
    expect(next.due(6 * HOUR)).toBe(true)
  })

  it('runs on the next tick once woken', () => {
    const next = new NextRun()
    next.sleepUntil(null, 6 * HOUR, 0)
    next.wake()
    expect(next.due(1)).toBe(true)
  })

  it('stays up when woken between looking for work and going to sleep', () => {
    const next = new NextRun()
    const mark = next.mark()
    next.wake() // a join committed after the job looked
    next.sleepUntil(null, 6 * HOUR, 0, mark)
    expect(next.due(1)).toBe(true)
  })

  it('is due at once when the deadline already passed', () => {
    const next = new NextRun()
    next.sleepUntil(new Date(0), 6 * HOUR, 5000)
    expect(next.due(5000)).toBe(true)
  })
})
