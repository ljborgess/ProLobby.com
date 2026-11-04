import { sampleLobbyClosedEvent, sampleQueueBoardEvent } from '@prolobby/types'

import { BRAND } from '../../discord/brand'
import {
  BOARD_PLATE,
  announceLobbyClosed,
  boardMessage,
  lobbyClosedMessage,
  showQueueBoard,
} from './queue-status'

describe('#fila-status', () => {
  it('is a scoreboard picture, green while lobbies close, with the bands as alt text', async () => {
    const message = await boardMessage(sampleQueueBoardEvent())
    const [embed] = message.embeds

    expect(embed!.author?.name).toBe(BOARD_PLATE)
    expect(embed!.color).toBe(BRAND.green)
    expect(embed!.image?.url).toBe('attachment://fila.png')
    expect(message.files![0]!.attachment.subarray(1, 4).toString()).toBe('PNG')
    expect(message.files![0]!.description).toContain('GOL pouca gente')
    expect(message.files![0]!.description).toContain('MEI cheia')
  })

  it('turns amber and says why when the queue is paused', async () => {
    const event = sampleQueueBoardEvent()
    event.payload.paused = 'lobbies_full'
    const [embed] = (await boardMessage(event)).embeds

    expect(embed!.color).toBe(BRAND.amber)
    expect(embed!.description).toContain('todos os lobbies ocupados')
  })

  it('links to the queue on the site, never acting for the player', async () => {
    const message = await boardMessage(sampleQueueBoardEvent(), {
      webUrl: 'https://prolobby.test/',
    })

    expect(message.components![0]!.components[0]).toMatchObject({
      url: 'https://prolobby.test/queue',
    })
  })

  it('counts the humans of a closed lobby without naming anyone', async () => {
    const event = sampleLobbyClosedEvent()
    const message = await lobbyClosedMessage(event)
    const text = JSON.stringify({ ...message, files: message.files!.map((f) => f.description) })

    expect(text).toContain('5 × 5')
    for (const id of event.payload.sideA.discordIds) expect(text).not.toContain(id)
  })

  it('updates the board in the configured channel, and does nothing without one', async () => {
    const upsertBoard = jest.fn().mockResolvedValue(undefined)
    const post = jest.fn()

    await showQueueBoard(sampleQueueBoardEvent(), {
      channelId: '900000000000000004',
      upsertBoard,
      post,
    })
    await showQueueBoard(sampleQueueBoardEvent(), { upsertBoard, post })

    expect(upsertBoard).toHaveBeenCalledTimes(1)
    expect(upsertBoard.mock.calls[0]![0]).toBe('900000000000000004')
  })

  it('never fails the lobby event over the public card', async () => {
    const warn = jest.fn()
    const post = jest.fn().mockRejectedValue(new Error('missing access'))

    await expect(
      announceLobbyClosed(
        sampleLobbyClosedEvent(),
        { channelId: '900000000000000004', upsertBoard: jest.fn(), post },
        warn,
      ),
    ).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing access'))
  })
})
