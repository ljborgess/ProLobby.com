/**
 * When the channels of a lobby go — #251, RF-052, RF-053, RF-054
 * (docs/discord/02-canais.md). The rule is pure so it can be tested on a
 * fake clock; `scheduleLobbySweep` in `lobby-channels.ts` feeds it the
 * server every minute.
 *
 * The three thresholds are "a calibrar" until the in-game checklist (#63).
 */

/** Voice is optional: before this, an empty call means nobody joined yet. */
export const LOBBY_CHANNEL_FLOOR_MS = 15 * 60 * 1000
/** Somebody left Discord open in the call: it goes anyway. */
export const LOBBY_CHANNEL_CEILING_MS = 3 * 60 * 60 * 1000
/** Both calls empty this long: the match is over. */
export const LOBBY_CHANNEL_EMPTY_MS = 10 * 60 * 1000
/** Past this many channels the server is near Discord's 500 (RF-053). */
export const CHANNEL_ALERT_AT = 400

const LOBBY_CHANNEL = /^(?:time-a|time-b|lobby)-([0-9a-f]{8})$/

export type ServerChannel = {
  id: string
  name: string
  createdAt: number
  /** People in it now; null for a text channel. */
  voiceMembers: number | null
}

export type LobbyGroup = {
  tag: string
  /** The first of the three: the bot makes them seconds after `closed_at`. */
  openedAt: number
  occupied: boolean
  channelIds: string[]
}

/** The server's lobby channels, by lobby. Everything else is left alone. */
export function lobbyGroups(channels: ServerChannel[]): LobbyGroup[] {
  const groups = new Map<string, LobbyGroup>()
  for (const channel of channels) {
    const tag = LOBBY_CHANNEL.exec(channel.name)?.[1]
    if (!tag) continue
    const group = groups.get(tag) ?? {
      tag,
      openedAt: channel.createdAt,
      occupied: false,
      channelIds: [],
    }
    group.openedAt = Math.min(group.openedAt, channel.createdAt)
    group.occupied ||= (channel.voiceMembers ?? 0) > 0
    group.channelIds.push(channel.id)
    groups.set(tag, group)
  }
  return [...groups.values()]
}

/**
 * One pass: updates when each lobby's calls went empty and returns the
 * groups to delete. A lobby the bot restarted on starts its empty clock at
 * the first pass that sees it empty — up to 10 min late, never early.
 */
export function sweep(groups: LobbyGroup[], emptySince: Map<string, number>, now: number) {
  const due: LobbyGroup[] = []
  for (const group of groups) {
    if (group.occupied) emptySince.delete(group.tag)
    else if (!emptySince.has(group.tag)) emptySince.set(group.tag, now)

    const age = now - group.openedAt
    const empty = emptySince.get(group.tag)
    const quiet = empty !== undefined && now - empty >= LOBBY_CHANNEL_EMPTY_MS
    if (age >= LOBBY_CHANNEL_CEILING_MS || (age >= LOBBY_CHANNEL_FLOOR_MS && quiet)) {
      due.push(group)
      emptySince.delete(group.tag)
    }
  }
  // Lobbies gone some other way (`lobby.ended`, by hand) are forgotten.
  const seen = new Set(groups.map((group) => group.tag))
  for (const tag of emptySince.keys()) if (!seen.has(tag)) emptySince.delete(tag)
  return due
}
