import { sampleLobbyClosedEvent, sampleQueueBoardEvent } from '@prolobby/types'

import {
  BOARD_TITLE,
  announceLobbyClosed,
  boardMessage,
  lobbyClosedLine,
  showQueueBoard,
} from './queue-status'

describe('#fila-status', () => {
  it('shows one line per category, by band, and that lobbies are closing', () => {
    const text = boardMessage(sampleQueueBoardEvent())

    expect(text.startsWith(BOARD_TITLE)).toBe(true)
    expect(text).toContain('`GOL` ⚪ pouca gente')
    expect(text).toContain('`MEI` 🔥 cheia')
    expect(text).toContain('▶️ Fechando lobbies')
    expect(text).toMatch(/<t:\d+:R>/)
  })

  it('says why the queue is paused', () => {
    const event = sampleQueueBoardEvent()
    event.payload.paused = 'lobbies_full'

    expect(boardMessage(event)).toContain('todos os lobbies ocupados')
  })

  it('counts the humans of a closed lobby without naming anyone', () => {
    const event = sampleLobbyClosedEvent()
    const line = lobbyClosedLine(event)

    expect(line).toContain('5 contra 5')
    for (const id of event.payload.sideA.discordIds) expect(line).not.toContain(id)
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

  it('never fails the lobby event over the public line', async () => {
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
