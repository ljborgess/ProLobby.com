import { RoleOrder } from './role-order'

describe('RoleOrder', () => {
  it('drops an event older than the last one applied for that person', () => {
    const order = new RoleOrder()
    order.applied('1', '2026-11-12T10:00:05Z')

    expect(order.isStale('1', '2026-11-12T10:00:00Z')).toBe(true)
    expect(order.isStale('1', '2026-11-12T10:00:06Z')).toBe(false)
    expect(order.isStale('2', '2026-11-12T10:00:00Z')).toBe(false)
  })
})
