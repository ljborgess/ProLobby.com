import { movementBand } from './queue.service'

describe('movementBand (RF-008, #233)', () => {
  it('is low under 5, busy from 5 to 15, full over 15', () => {
    expect([0, 4, 5, 15, 16].map(movementBand)).toEqual(['low', 'low', 'busy', 'busy', 'full'])
  })
})
