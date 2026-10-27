import { randomUUID } from 'node:crypto'
import type { BotEvent, LobbyClosedEvent } from '@prolobby/types'

export type LobbyChannelSpec = {
  name: string
  kind: 'voice' | 'text'
  /** Discord ids that may see and use it; nobody else can. */
  members: string[]
}

export type LobbyChannelsDeps = {
  /** A channel of the server with this name, if one exists: how a retry finds its own. */
  findChannel: (name: string) => Promise<{ id: string } | null>
  createChannel: (spec: LobbyChannelSpec) => Promise<{ id: string }>
  /** No message in it yet: a retry posts the one a failed send left out. */
  isSilent: (channelId: string) => Promise<boolean>
  /** Posts and pings exactly `mentions`, nobody else. */
  send: (channelId: string, content: string, mentions: string[]) => Promise<void>
  report: (event: BotEvent) => Promise<{ status: number }>
}

/**
 * Names carry the whole lobby id, so a retry finds the channels instead of
 * making them twice, and two lobbies never share a name (a short prefix could,
 * and the second would get the first one's private channels).
 */
export const lobbyChannelNames = (lobbyId: string) => ({
  voiceA: `time-a-${lobbyId}`,
  voiceB: `time-b-${lobbyId}`,
  text: `lobby-${lobbyId}`,
})

/**
 * #250, RF-059: the three channels of a closed lobby, one after the other —
 * the two teams' private voice channels, then the shared text channel with
 * both captains, their clubs and how the match happens, pinging every human.
 * Then the ids go back to the API, which keeps them (the #251 deletes by
 * them) and opens the formation vote.
 *
 * A retry of the same `lobby.closed` (the report to the API failed, the bot
 * restarted) reuses the channels it finds by name and posts nothing again.
 */
export async function openLobbyChannels(
  event: LobbyClosedEvent,
  deps: LobbyChannelsDeps,
): Promise<void> {
  const { lobbyId, sideA, sideB } = event.payload
  const names = lobbyChannelNames(lobbyId)

  const ensure = async (spec: LobbyChannelSpec) => {
    const existing = await deps.findChannel(spec.name)
    return { id: (existing ?? (await deps.createChannel(spec))).id, created: !existing }
  }
  const voiceA = await ensure({ name: names.voiceA, kind: 'voice', members: sideA.discordIds })
  const voiceB = await ensure({ name: names.voiceB, kind: 'voice', members: sideB.discordIds })
  const everyone = [...sideA.discordIds, ...sideB.discordIds]
  const text = await ensure({ name: names.text, kind: 'text', members: everyone })

  if (text.created || (await deps.isSilent(text.id))) {
    await deps.send(text.id, closedMessage(event), everyone)
  }

  const { status } = await deps.report({
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
    type: 'lobby.channels_created',
    payload: {
      lobbyId,
      textChannelId: text.id,
      voiceAChannelId: voiceA.id,
      voiceBChannelId: voiceB.id,
    },
  })
  // Thrown, the bot answers 503 and the API sends `lobby.closed` again: the
  // channels are found by name and only the report repeats.
  if (status < 200 || status >= 300) {
    throw new Error(`the API did not take the channels of lobby ${lobbyId}: HTTP ${status}`)
  }
}

/**
 * A club name is typed by a player: inside inline code Discord renders it as
 * text, so a "[pix](https://…)" is no masked link and a "<@id>" no fake mention.
 */
const clubLabel = (name: string) => '`' + name.replace(/`/g, "'") + '`'

/** Shared channel: both languages, short (docs/discord/03-bot.md). */
function closedMessage(event: LobbyClosedEvent): string {
  const { sideA, sideB } = event.payload
  const captain = (side: LobbyClosedEvent['payload']['sideA']) =>
    `<@${side.captainDiscordId}> · ${clubLabel(side.clubName)}`
  return [
    '**Lobby fechado · Lobby cerrado**',
    `Time A: ${captain(sideA)}`,
    `Time B: ${captain(sideB)}`,
    '',
    'Cada capitão manda o convite pro próprio clube. Aceite e marque "recebi o convite" na plataforma em até 5 min. A voz é opcional: o canal do seu time está aqui ao lado.',
    'Cada capitán envía la invitación a su club. Acéptala y marca "recibí la invitación" en la plataforma en hasta 5 min. La voz es opcional: el canal de tu equipo está aquí al lado.',
    '',
    [...sideA.discordIds, ...sideB.discordIds].map((id) => `<@${id}>`).join(' '),
  ].join('\n')
}
