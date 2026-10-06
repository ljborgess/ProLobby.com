import { cutsDue } from './elo-decay.service'

describe('cutsDue (RF-017)', () => {
  it.each([
    [0, 0],
    [60, 0],
    [89, 0],
    [90, 1],
    [119, 1],
    [120, 2],
    [150, 3],
  ])('owes %i days idle %i cut(s)', (days, cuts) => {
    expect(cutsDue(days)).toBe(cuts)
  })
})
