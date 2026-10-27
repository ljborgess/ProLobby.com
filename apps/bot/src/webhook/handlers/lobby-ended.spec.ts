import { randomUUID } from 'node:crypto'

import { lobbyChannelNames } from './lobby-closed'
import { dropLobbyChannels } from './lobby-ended'

describe('dropLobbyChannels (#251)', () => {
  const lobbyId = '11111111-1111-1111-1111-000000000200'
  const ended = {
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
    type: 'lobby.ended' as const,
    payload: { lobbyId },
  }

  it('deletes the three channels of the lobby at once', async () => {
    const names = Object.values(lobbyChannelNames(lobbyId))
    const deps = {
      findChannel: jest.fn(async (name: string) => ({ id: `id-${name}` })),
      deleteChannel: jest.fn().mockResolvedValue(undefined),
    }

    await dropLobbyChannels(ended, deps)

    expect(deps.deleteChannel.mock.calls.map(([id]) => id)).toEqual(
      names.map((name) => `id-${name}`),
    )
  })

  it('a retry, with the channels already gone, deletes nothing', async () => {
    const deps = {
      findChannel: jest.fn().mockResolvedValue(null),
      deleteChannel: jest.fn(),
    }

    await dropLobbyChannels(ended, deps)

    expect(deps.deleteChannel).not.toHaveBeenCalled()
  })
})
