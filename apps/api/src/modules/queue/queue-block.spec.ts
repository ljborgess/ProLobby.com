import { blockedUntil } from './queue-block'

const NOW = new Date('2026-10-07T20:00:00Z')
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const ago = (ms: number) => new Date(NOW.getTime() - ms)
const minutesLeft = (until: Date | null) =>
  until === null ? null : (until.getTime() - NOW.getTime()) / MINUTE

describe('blockedUntil (#232)', () => {
  it('is free with no refusal', () => {
    expect(blockedUntil([], null, NOW)).toBeNull()
  })

  it('climbs 5, 15, 30 and 120 minutes, and stays at 120 (RF-009)', () => {
    const chain = (n: number) => Array.from({ length: n }, (_, i) => ago((n - 1 - i) * HOUR))
    expect(minutesLeft(blockedUntil(chain(1), null, NOW))).toBe(5)
    expect(minutesLeft(blockedUntil(chain(2), null, NOW))).toBe(15)
    expect(minutesLeft(blockedUntil(chain(3), null, NOW))).toBe(30)
    expect(minutesLeft(blockedUntil(chain(4), null, NOW))).toBe(120)
    expect(minutesLeft(blockedUntil(chain(6), null, NOW))).toBe(120)
  })

  it('ends when the time is served', () => {
    expect(blockedUntil([ago(5 * MINUTE)], null, NOW)).toBeNull()
    expect(minutesLeft(blockedUntil([ago(4 * MINUTE)], null, NOW))).toBe(1)
  })

  it('starts over after 12 h without a refusal (RF-010)', () => {
    const refusals = [ago(14 * HOUR), ago(13 * HOUR), ago(0)]
    expect(minutesLeft(blockedUntil(refusals, null, NOW))).toBe(5)
  })

  it('keeps climbing with gaps under 12 h, even past 12 h in total', () => {
    const refusals = [ago(12.5 * HOUR), ago(6 * HOUR), ago(0)]
    expect(minutesLeft(blockedUntil(refusals, null, NOW))).toBe(30)
  })

  it('starts over at once after a completed match (RF-010)', () => {
    const refusals = [ago(3 * HOUR), ago(2 * HOUR), ago(0)]
    expect(minutesLeft(blockedUntil(refusals, ago(1 * HOUR), NOW))).toBe(5)
    expect(blockedUntil(refusals.slice(0, 2), ago(1 * HOUR), NOW)).toBeNull()
  })
})
