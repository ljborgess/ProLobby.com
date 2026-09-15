import { EntityManager } from '@mikro-orm/postgresql'
import { sampleLobbyClosedEvent } from '@prolobby/types'

import { Clock } from '../../common/time/clock'
import { EventDelivery } from './event-delivery.entity'
import { EventDeliveryTargetKind } from './event-delivery.enums'
import { EventDeliveryService } from './event-delivery.service'
import { WebhookClient } from './webhook-client'

class FakeClock extends Clock {
  private current = new Date('2026-09-14T12:00:00.000Z')
  private readonly timers: { at: number; fn: () => void }[] = []

  now(): Date {
    return new Date(this.current)
  }

  schedule(delayMs: number, fn: () => void): () => void {
    const timer = { at: this.current.getTime() + delayMs, fn }
    this.timers.push(timer)
    return () => {
      const index = this.timers.indexOf(timer)
      if (index >= 0) {
        this.timers.splice(index, 1)
      }
    }
  }

  async tick(ms: number): Promise<void> {
    const target = this.current.getTime() + ms
    this.current = new Date(target)
    const due = this.timers.filter((timer) => timer.at <= target)
    for (const timer of due) {
      const index = this.timers.indexOf(timer)
      if (index >= 0) {
        this.timers.splice(index, 1)
      }
      timer.fn()
    }
    await Promise.resolve()
  }
}

describe('EventDeliveryService', () => {
  const event = sampleLobbyClosedEvent()

  const createService = (
    webhook: Pick<WebhookClient, 'post'>,
    clock: Clock,
    pending: EventDelivery[] = [],
  ) => {
    const em = {
      fork: () => em,
      find: jest.fn().mockResolvedValue(pending),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      create: jest.fn((_cls: unknown, data: object) => ({
        id: 'delivery-1',
        attempts: 0,
        ...data,
      })),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
    }

    const service = new EventDeliveryService(
      em as unknown as EntityManager,
      clock,
      webhook as WebhookClient,
    )

    return { service, em }
  }

  it('does not query the table on a timer when nothing is pending', async () => {
    const clock = new FakeClock()
    const { service, em } = createService({ post: jest.fn() }, clock)

    await service.recoverPending()
    expect(em.find).toHaveBeenCalledTimes(1)
    expect(service.getPendingLookupCount()).toBe(1)

    await clock.tick(60_000)
    await clock.tick(60_000)

    expect(em.find).toHaveBeenCalledTimes(1)
    expect(service.getPendingLookupCount()).toBe(1)
  })

  it('re-arms a pending delivery left by a restart', async () => {
    const clock = new FakeClock()
    const post = jest.fn().mockResolvedValue({ status: 202 })
    const pending = {
      id: 'delivery-pending',
      eventId: event.id,
      type: event.type,
      payload: event.payload,
      attempts: 1,
      deliveredAt: undefined,
      nextAttemptAt: new Date(clock.now().getTime() + 5_000),
      targetKind: EventDeliveryTargetKind.LOBBY,
      createdAt: clock.now(),
    } as EventDelivery

    const { service, em } = createService({ post }, clock, [pending])
    em.findOne.mockResolvedValue({ ...pending, attempts: 1 })

    await service.recoverPending()
    expect(post).not.toHaveBeenCalled()

    await clock.tick(5_000)
    await new Promise((resolve) => setImmediate(resolve))

    expect(post).toHaveBeenCalled()
  })

  it('treats HTTP 429 as try-later, not as a definitive failure', async () => {
    const clock = new FakeClock()
    const post = jest
      .fn()
      .mockResolvedValueOnce({ status: 429 })
      .mockResolvedValueOnce({ status: 202 })

    const { service, em } = createService({ post }, clock)
    const row = {
      id: 'delivery-1',
      eventId: event.id,
      type: event.type,
      payload: event.payload,
      attempts: 0,
      targetKind: EventDeliveryTargetKind.LOBBY,
      createdAt: clock.now(),
    } as EventDelivery
    em.create.mockReturnValue(row)
    em.findOne.mockResolvedValue(row)

    await service.enqueue(event, { kind: EventDeliveryTargetKind.LOBBY, id: event.payload.lobbyId })
    await new Promise((resolve) => setImmediate(resolve))

    expect(post).toHaveBeenCalledTimes(1)
    expect(row.attempts).toBe(1)

    await clock.tick(10_000)
    await new Promise((resolve) => setImmediate(resolve))

    expect(post).toHaveBeenCalledTimes(2)
    expect(row.deliveredAt).toBeInstanceOf(Date)
  })
})
