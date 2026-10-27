import {
  LOBBY_CHANNEL_CEILING_MS,
  LOBBY_CHANNEL_EMPTY_MS,
  LOBBY_CHANNEL_FLOOR_MS,
  lobbyGroups,
  sweep,
  type ServerChannel,
} from './lobby-sweep'

const MINUTE = 60 * 1000
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OPENED = Date.parse('2026-10-27T20:00:00Z')

/** The three channels of lobby `tag`, opened at OPENED, with people in voice A. */
const lobby = (tag: string, inVoiceA = 0): ServerChannel[] => [
  { id: `${tag}-a`, name: `time-a-${tag}`, createdAt: OPENED, voiceMembers: inVoiceA },
  { id: `${tag}-b`, name: `time-b-${tag}`, createdAt: OPENED + 1000, voiceMembers: 0 },
  { id: `${tag}-t`, name: `lobby-${tag}`, createdAt: OPENED + 2000, voiceMembers: null },
]

/** Runs the sweep once a minute until `until`, returning the minute each tag went. */
function run(channels: (now: number) => ServerChannel[], until: number) {
  const emptySince = new Map<string, number>()
  const gone = new Map<string, number>()
  for (let now = OPENED; now <= until; now += MINUTE) {
    const left = channels(now).filter((c) => !gone.has(c.name.slice(-36)))
    for (const group of sweep(lobbyGroups(left), emptySince, now)) gone.set(group.tag, now)
  }
  return gone
}

describe('lobby channel sweep (#251)', () => {
  it('groups the three channels of a lobby and ignores every other channel', () => {
    const groups = lobbyGroups([
      ...lobby(ID),
      { id: 'x', name: 'geral', createdAt: 0, voiceMembers: null },
      { id: 'y', name: 'lobby-geral', createdAt: 0, voiceMembers: null },
    ])

    expect(groups).toEqual([
      {
        tag: ID,
        openedAt: OPENED,
        occupied: false,
        channelIds: [`${ID}-a`, `${ID}-b`, `${ID}-t`],
      },
    ])
  })

  it('nobody ever joins: they go at the 15 min floor, never earlier', () => {
    const gone = run(() => lobby(ID), OPENED + 60 * MINUTE)

    expect(gone.get(ID)).toBe(OPENED + LOBBY_CHANNEL_FLOOR_MS)
  })

  it('a call in use keeps them; 10 min after it empties they go', () => {
    const leftAt = OPENED + 50 * MINUTE
    const gone = run((now) => lobby(ID, now < leftAt ? 3 : 0), OPENED + 2 * 60 * MINUTE)

    expect(gone.get(ID)).toBe(leftAt + LOBBY_CHANNEL_EMPTY_MS)
  })

  it('someone who never leaves the call: they go at the 3 h ceiling', () => {
    const gone = run(() => lobby(ID, 1), OPENED + 4 * 60 * MINUTE)

    expect(gone.get(ID)).toBe(OPENED + LOBBY_CHANNEL_CEILING_MS)
  })

  it('a bot restarted mid-lobby waits the full 10 min of empty calls again', () => {
    const emptySince = new Map<string, number>()
    const late = OPENED + 40 * MINUTE

    expect(sweep(lobbyGroups(lobby(ID)), emptySince, late)).toEqual([])
    expect(sweep(lobbyGroups(lobby(ID)), emptySince, late + 9 * MINUTE)).toEqual([])
    expect(sweep(lobbyGroups(lobby(ID)), emptySince, late + 10 * MINUTE)).toHaveLength(1)
  })
})
