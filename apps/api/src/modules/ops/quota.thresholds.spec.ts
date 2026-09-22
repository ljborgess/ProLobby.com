import { highestMetThreshold, QUOTA_CAPS, usagePercent } from './quota.thresholds'

describe('quota thresholds (ADR-009 / #123)', () => {
  it('alerts Neon storage at 70% and 90% of 0.5 GB', () => {
    expect(QUOTA_CAPS.neon_storage.percents).toEqual([70, 90])
    expect(usagePercent(0.35 * 1_000_000_000, QUOTA_CAPS.neon_storage.cap)).toBe(70)
    expect(highestMetThreshold(70, QUOTA_CAPS.neon_storage.percents)).toBe(70)
    expect(highestMetThreshold(91, QUOTA_CAPS.neon_storage.percents)).toBe(90)
    expect(highestMetThreshold(69, QUOTA_CAPS.neon_storage.percents)).toBeUndefined()
  })

  it('alerts Neon egress earlier — 5 GB/month suspends the project', () => {
    expect(QUOTA_CAPS.neon_egress.percents).toEqual([60, 80])
    expect(highestMetThreshold(60, QUOTA_CAPS.neon_egress.percents)).toBe(60)
  })

  it('alerts Object Storage only at 80% of 20 GiB', () => {
    expect(QUOTA_CAPS.object_storage.percents).toEqual([80])
    expect(highestMetThreshold(79, QUOTA_CAPS.object_storage.percents)).toBeUndefined()
    expect(highestMetThreshold(80, QUOTA_CAPS.object_storage.percents)).toBe(80)
  })

  it('never reports more than 100%', () => {
    expect(usagePercent(QUOTA_CAPS.neon_compute.cap * 3, QUOTA_CAPS.neon_compute.cap)).toBe(100)
  })
})
