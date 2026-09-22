import { Logger } from '@nestjs/common'
import type { PlatformEvent } from '@prolobby/types'

import { Clock } from '../../common/time/clock'
import type { EventDeliveryService } from '../bot-integration/event-delivery.service'
import { EventDeliveryTargetKind } from '../bot-integration/event-delivery.enums'
import type { NeonConsumptionClient } from './neon-consumption.client'
import { QuotaAlertJob } from './quota-alert.job'

class FakeClock extends Clock {
  constructor(private current: Date) {
    super()
  }

  now(): Date {
    return new Date(this.current)
  }

  schedule(): () => void {
    return () => undefined
  }
}

describe('QuotaAlertJob (#123)', () => {
  const neonRead = jest.fn()
  const enqueue = jest.fn()

  const job = () =>
    new QuotaAlertJob(
      { enqueue } as unknown as EventDeliveryService,
      { read: neonRead } as unknown as NeonConsumptionClient,
      new FakeClock(new Date('2026-09-22T12:00:00.000Z')),
    )

  beforeEach(() => {
    neonRead.mockReset()
    enqueue.mockReset()
    jest.spyOn(Logger.prototype, 'log').mockImplementation()
    jest.spyOn(Logger.prototype, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('does nothing below the first threshold and never talks to Postgres', async () => {
    neonRead.mockResolvedValue({
      storageBytes: 0.2 * 1_000_000_000,
      computeSeconds: 1000,
      egressBytes: 1_000,
    })

    await job().run()

    expect(enqueue).not.toHaveBeenCalled()
    expect(neonRead).toHaveBeenCalledTimes(1)
  })

  it('enqueues system.quota_alert at 70% storage, targeted at system, with no user field', async () => {
    neonRead.mockResolvedValue({
      storageBytes: 0.35 * 1_000_000_000,
      computeSeconds: 0,
      egressBytes: 0,
    })

    await job().run()

    expect(enqueue).toHaveBeenCalledTimes(1)
    const [event, target] = enqueue.mock.calls[0] as [
      PlatformEvent,
      { kind: EventDeliveryTargetKind },
    ]
    expect(event.type).toBe('system.quota_alert')
    expect(event.payload).toEqual({ resource: 'neon_storage', percent: 70, limit: '0.5GB' })
    expect(event.payload).not.toHaveProperty('accountId')
    expect(target).toEqual({ kind: EventDeliveryTargetKind.SYSTEM })
  })

  it('does not enqueue the same threshold twice on the same UTC day', async () => {
    neonRead.mockResolvedValue({
      storageBytes: 0.4 * 1_000_000_000,
      computeSeconds: 0,
      egressBytes: 0,
    })
    const instance = job()

    await instance.run()
    await instance.run()

    expect(enqueue).toHaveBeenCalledTimes(1)
  })

  /**
   * Code review of 2026-09-22 (#123): documents the known, accepted gap named
   * in the `ponytail:` comment on `alerted`. A fresh instance is exactly what
   * a redeploy produces — the in-memory dedup does not survive it. This test
   * exists so the trade-off stays visible in the suite, not only in a comment
   * that nobody re-reads once it is merged.
   */
  it('re-alerts the same day across a restart — the accepted cost of in-memory dedup', async () => {
    neonRead.mockResolvedValue({
      storageBytes: 0.4 * 1_000_000_000,
      computeSeconds: 0,
      egressBytes: 0,
    })

    await job().run()
    await job().run()

    expect(enqueue).toHaveBeenCalledTimes(2)
  })

  it('does not throw when Neon is unreachable — a quota miss must not take the API down', async () => {
    neonRead.mockRejectedValue(new Error('timeout'))

    await expect(job().checkQuotas()).resolves.toBeUndefined()
    expect(enqueue).not.toHaveBeenCalled()
  })
})
