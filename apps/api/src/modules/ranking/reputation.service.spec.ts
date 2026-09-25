import { ReputationEventReason } from './ranking-event.enums'
import { reputationBand, reputationDelta } from './reputation.service'

describe('reputationDelta', () => {
  it('adds 1 for a clean match only below 70', () => {
    expect(reputationDelta(ReputationEventReason.CLEAN_MATCH, 69)).toBe(1)
    expect(reputationDelta(ReputationEventReason.CLEAN_MATCH, 70)).toBe(0)
    expect(reputationDelta(ReputationEventReason.CLEAN_MATCH, 85)).toBe(0)
  })

  it('takes 8 for a disconnect, never below zero', () => {
    expect(reputationDelta(ReputationEventReason.DISCONNECT, 70)).toBe(-8)
    expect(reputationDelta(ReputationEventReason.DISCONNECT, 5)).toBe(-5)
    expect(reputationDelta(ReputationEventReason.DISCONNECT, 0)).toBe(0)
  })

  it('brings a served suspension back to 45 from wherever it was (RF-074)', () => {
    expect(reputationDelta(ReputationEventReason.SUSPENSION_SERVED, 38)).toBe(7)
    expect(reputationDelta(ReputationEventReason.SUSPENSION_SERVED, 12)).toBe(33)
    expect(reputationDelta(ReputationEventReason.SUSPENSION_SERVED, 45)).toBe(0)
  })
})

describe('reputationBand', () => {
  it.each([
    [100, 'good'],
    [55, 'good'],
    [54, 'slow_queue'],
    [40, 'slow_queue'],
    [39, 'suspension'],
    [25, 'suspension'],
    [24, 'ban'],
    [0, 'ban'],
  ])('reads %i as %s', (reputation, band) => {
    expect(reputationBand(reputation)).toBe(band)
  })
})
