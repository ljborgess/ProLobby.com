import { sampleLobbyClosedEvent } from '@prolobby/types'

import { lobbyChannelNames, openLobbyChannels, type LobbyChannelSpec } from './lobby-closed'

/** A server that only knows what this handler did to it. */
function fakeServer(report = jest.fn().mockResolvedValue({ status: 204 })) {
  const channels = new Map<string, LobbyChannelSpec & { id: string }>()
  let next = 900000000000000001n
  const deps = {
    findChannel: jest.fn(async (name: string) => channels.get(name) ?? null),
    createChannel: jest.fn(async (spec: LobbyChannelSpec) => {
      const channel = { ...spec, id: String(next++) }
      channels.set(spec.name, channel)
      return channel
    }),
    send: jest.fn().mockResolvedValue(undefined),
    report,
  }
  return { channels, deps }
}

describe('openLobbyChannels (#250)', () => {
  const event = sampleLobbyClosedEvent()
  const { sideA, sideB, lobbyId } = event.payload
  const names = lobbyChannelNames(lobbyId)

  it('opens team A voice, team B voice and the shared text, in that order', async () => {
    const { deps } = fakeServer()

    await openLobbyChannels(event, deps)

    expect(deps.createChannel.mock.calls.map(([spec]) => [spec.name, spec.kind])).toEqual([
      [names.voiceA, 'voice'],
      [names.voiceB, 'voice'],
      [names.text, 'text'],
    ])
  })

  it('lets into each voice channel only the humans of that side', async () => {
    const { channels, deps } = fakeServer()

    await openLobbyChannels(event, deps)

    expect(channels.get(names.voiceA)!.members).toEqual(sideA.discordIds)
    expect(channels.get(names.voiceB)!.members).toEqual(sideB.discordIds)
    expect(channels.get(names.text)!.members).toEqual([...sideA.discordIds, ...sideB.discordIds])
  })

  it('names both captains and clubs in the text channel and pings every human', async () => {
    const { channels, deps } = fakeServer()

    await openLobbyChannels(event, deps)

    const [channelId, content, mentions] = deps.send.mock.calls[0]!
    expect(channelId).toBe(channels.get(names.text)!.id)
    expect(content).toContain(`Time A: <@${sideA.captainDiscordId}> · **Clube Azul**`)
    expect(content).toContain(`Time B: <@${sideB.captainDiscordId}> · **Clube Rojo**`)
    expect(mentions).toEqual([...sideA.discordIds, ...sideB.discordIds])
  })

  it('escapes markdown in a club name, which a player typed', async () => {
    const { deps } = fakeServer()
    const styled = sampleLobbyClosedEvent()
    styled.payload.sideA.clubName = '**Fake**_club'

    await openLobbyChannels(styled, deps)

    expect(deps.send.mock.calls[0]![1]).toContain('\\*\\*Fake\\*\\*\\_club')
  })

  it('sends the three ids back to the API', async () => {
    const { channels, deps } = fakeServer()

    await openLobbyChannels(event, deps)

    expect(deps.report).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'lobby.channels_created',
        payload: {
          lobbyId,
          textChannelId: channels.get(names.text)!.id,
          voiceAChannelId: channels.get(names.voiceA)!.id,
          voiceBChannelId: channels.get(names.voiceB)!.id,
        },
      }),
    )
  })

  it('a retry of the same event reuses the channels and posts nothing twice', async () => {
    const report = jest
      .fn()
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 204 })
    const { channels, deps } = fakeServer(report)

    await expect(openLobbyChannels(event, deps)).rejects.toThrow('HTTP 503')
    await openLobbyChannels(event, deps)

    expect(deps.createChannel).toHaveBeenCalledTimes(3)
    expect(deps.send).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenLastCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ textChannelId: channels.get(names.text)!.id }),
      }),
    )
  })
})
