import { BOT_STATUS_STALE_MS, CoordinationState, LOBBY_PAUSE_AT } from './coordination-state'

describe('CoordinationState (#271)', () => {
  const NOW = Date.parse('2026-10-28T12:00:00Z')
  const fresh = (status: { discordReady: boolean; channelCount: number }) => {
    const state = new CoordinationState()
    state.recordBot(status, NOW)
    return state
  }

  afterEach(() => {
    delete process.env.NODE_ENV
  })

  it('runs with a connected bot and room for three channels', () => {
    expect(fresh({ discordReady: true, channelCount: 497 }).pause(NOW)).toBeNull()
  })

  it('pauses when Discord is down, or three more channels would pass 500', () => {
    expect(fresh({ discordReady: false, channelCount: 10 }).pause(NOW)).toBe('discord_unavailable')
    expect(fresh({ discordReady: true, channelCount: 498 }).pause(NOW)).toBe('channels_full')
  })

  it('a silent bot pauses the queue in production only', () => {
    const state = fresh({ discordReady: true, channelCount: 10 })
    expect(state.pause(NOW + BOT_STATUS_STALE_MS + 1)).toBeNull()

    process.env.NODE_ENV = 'production'
    const production = new CoordinationState()
    expect(production.pause(NOW)).toBe('discord_unavailable')
    production.recordBot({ discordReady: true, channelCount: 10 }, NOW)
    expect(production.pause(NOW + BOT_STATUS_STALE_MS)).toBeNull()
    expect(production.pause(NOW + BOT_STATUS_STALE_MS + 1)).toBe('discord_unavailable')
  })

  it('pauses at 9 lobbies at once and comes back when one ends', () => {
    const state = fresh({ discordReady: true, channelCount: 10 })

    state.recordLobbies(LOBBY_PAUSE_AT)
    expect(state.pause(NOW)).toBe('lobbies_full')
    state.recordLobbies(LOBBY_PAUSE_AT - 1)
    expect(state.pause(NOW)).toBeNull()
  })

  it('the bot outranks occupancy: the screen says Discord, which is the one to fix', () => {
    const state = fresh({ discordReady: false, channelCount: 10 })
    state.recordLobbies(LOBBY_PAUSE_AT)

    expect(state.pause(NOW)).toBe('discord_unavailable')
  })
})
