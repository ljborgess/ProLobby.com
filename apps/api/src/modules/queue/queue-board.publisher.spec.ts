import { CoordinationState } from '../bot-integration/coordination-state'
import { BOARD_MIN_INTERVAL_MS, QueueBoardPublisher } from './queue-board.publisher'

describe('QueueBoardPublisher (#fila-status)', () => {
  const bands = {
    goalkeeper: 'low',
    defender: 'busy',
    midfielder: 'full',
    winger: 'low',
    striker: 'low',
  }
  const setup = (status = 200) => {
    const queueService = { movement: jest.fn().mockResolvedValue({ ...bands }) }
    const webhook = { post: jest.fn().mockResolvedValue({ status }) }
    const publisher = new QueueBoardPublisher(
      queueService as never,
      new CoordinationState(),
      webhook as never,
    )
    return { publisher, queueService, webhook }
  }

  it('sends the bands and the pause, never a count', async () => {
    const { publisher, webhook } = setup()

    expect(await publisher.publish()).toBe(true)

    const event = webhook.post.mock.calls[0]![0]
    expect(event.type).toBe('queue.board')
    expect(event.payload).toEqual({ bands, paused: null })
  })

  it('stays quiet while nothing changes', async () => {
    const { publisher, webhook } = setup()

    await publisher.publish()
    expect(await publisher.publish()).toBe(false)

    expect(webhook.post).toHaveBeenCalledTimes(1)
  })

  it('sends again when a band moves, but not sooner than the minimum interval', async () => {
    const { publisher, webhook, queueService } = setup()
    const t0 = new Date('2026-11-04T12:00:00Z')

    await publisher.publish(t0)
    queueService.movement.mockResolvedValue({ ...bands, winger: 'busy' })
    expect(await publisher.publish(new Date(t0.getTime() + 5_000))).toBe(false)
    expect(await publisher.publish(new Date(t0.getTime() + BOARD_MIN_INTERVAL_MS))).toBe(true)

    expect(webhook.post).toHaveBeenCalledTimes(2)
  })

  it('tries again on the next run when the bot did not take it', async () => {
    const { publisher, webhook } = setup(503)

    await publisher.publish()
    await publisher.publish()

    expect(webhook.post).toHaveBeenCalledTimes(2)
  })

  it('swallows a bot that is not there at all', async () => {
    const { publisher, webhook } = setup()
    webhook.post.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(publisher.publish()).resolves.toBe(false)
  })
})
