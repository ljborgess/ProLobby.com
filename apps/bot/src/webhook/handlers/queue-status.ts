import type { LobbyClosedEvent, QueueBoardEvent } from '@prolobby/types'

/** The marker the bot finds its own board by after a restart. */
export const BOARD_TITLE = '**Fila agora** · **Fila ahora**'

const CATEGORY: [keyof QueueBoardEvent['payload']['bands'], string][] = [
  ['goalkeeper', 'GOL'],
  ['defender', 'ZAG'],
  ['midfielder', 'MEI'],
  ['winger', 'PON'],
  ['striker', 'ATA'],
]

const BAND: Record<QueueBoardEvent['payload']['bands']['goalkeeper'], string> = {
  low: '⚪ pouca gente · poca gente',
  busy: '🟢 movimentada · movida',
  full: '🔥 cheia · llena',
}

const PAUSE: Record<NonNullable<QueueBoardEvent['payload']['paused']>, string> = {
  discord_unavailable: '⏸️ Pausada: o Discord está fora do ar · Pausada: Discord caído',
  channels_full: '⏸️ Pausada: sem espaço pra canais de lobby · Pausada: sin espacio para canales',
  lobbies_full: '⏸️ Pausada: todos os lobbies ocupados · Pausada: todos los lobbies ocupados',
}

/**
 * The one message #fila-status keeps current. Both languages, short — the
 * channel is shared (docs/discord/03-bot.md). Bands only, as the app shows
 * them (RF-008); the time is Discord's own relative stamp.
 */
export function boardMessage(event: QueueBoardEvent): string {
  const { bands, paused } = event.payload
  const at = Math.floor(new Date(event.occurredAt).getTime() / 1000)
  return [
    BOARD_TITLE,
    ...CATEGORY.map(([key, code]) => `\`${code}\` ${BAND[bands[key]]}`),
    paused ? PAUSE[paused] : '▶️ Fechando lobbies · Cerrando lobbies',
    `-# atualizado <t:${at}:R>`,
  ].join('\n')
}

/** A public line per closed lobby: how many humans, never who. */
export function lobbyClosedLine(event: LobbyClosedEvent): string {
  const a = event.payload.sideA.discordIds.length
  const b = event.payload.sideB.discordIds.length
  return `⚽ Lobby fechado: ${a} contra ${b}, a IA do jogo completa o resto. · Lobby cerrado: ${a} contra ${b}, la IA del juego completa el resto.`
}

export type QueueStatusDeps = {
  /** `DISCORD_QUEUE_STATUS_CHANNEL_ID`. Unset, the feed is off. */
  channelId?: string
  /** Edits the board in place, or posts it when there is none yet. */
  upsertBoard: (channelId: string, content: string) => Promise<void>
  post: (channelId: string, content: string) => Promise<void>
}

export async function showQueueBoard(event: QueueBoardEvent, deps: QueueStatusDeps): Promise<void> {
  if (!deps.channelId) return
  await deps.upsertBoard(deps.channelId, boardMessage(event))
}

/**
 * Best effort: the lobby's channels are what matters on `lobby.closed`, so a
 * failed public line must not make the API retry the whole event.
 */
export async function announceLobbyClosed(
  event: LobbyClosedEvent,
  deps: QueueStatusDeps,
  warn: (message: string) => void,
): Promise<void> {
  if (!deps.channelId) return
  await deps.post(deps.channelId, lobbyClosedLine(event)).catch((error: unknown) => {
    warn(`lobby line not posted in #fila-status: ${error instanceof Error ? error.message : error}`)
  })
}
