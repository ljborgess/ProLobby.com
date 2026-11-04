import type { LobbyClosedEvent, QueueBoardEvent } from '@prolobby/types'

import { BRAND, linkRow, picture, plate, webLink, type BotMessage } from '../../discord/brand'
import { boardSvg, lobbySvg, render } from '../../discord/cards'

/** The plate the bot finds its own board by after a restart. */
export const BOARD_PLATE = 'PROLOBBY · FILA AO VIVO'

type Band = QueueBoardEvent['payload']['bands']['goalkeeper']

const POSITIONS: [keyof QueueBoardEvent['payload']['bands'], string, string][] = [
  ['goalkeeper', 'GOL', 'Goleiro'],
  ['defender', 'ZAG', 'Zaga'],
  ['midfielder', 'MEI', 'Meio-campo'],
  ['winger', 'PON', 'Ponta'],
  ['striker', 'ATA', 'Ataque'],
]

const BAND_WORD: Record<Band, string> = {
  low: 'pouca gente',
  busy: 'movimentada',
  full: 'cheia',
}

const PAUSE: Record<NonNullable<QueueBoardEvent['payload']['paused']>, string> = {
  discord_unavailable: 'o Discord está fora do ar · Discord caído',
  channels_full: 'sem espaço pra canais de lobby · sin espacio para canales',
  lobbies_full: 'todos os lobbies ocupados · todos los lobbies ocupados',
}

/**
 * The one message #fila-status keeps current: the scoreboard picture
 * (cards.ts), edited in place. Bands only, as the app shows them (RF-008);
 * green while lobbies close, stadium amber while paused. The text under it
 * says the same for screen readers and notifications.
 */
export function boardMessage(
  event: QueueBoardEvent,
  opts: { webUrl?: string; iconUrl?: string } = {},
): BotMessage {
  const { bands, paused } = event.payload
  const summary = POSITIONS.map(([key, code]) => `${code} ${BAND_WORD[bands[key]]}`).join(', ')
  const art = picture(
    'fila.png',
    render(boardSvg(bands, paused, event.occurredAt)),
    `Placar da fila: ${summary}. ${paused ? `Pausada: ${PAUSE[paused]}` : 'No ar.'}`,
  )
  return {
    embeds: [
      {
        author: plate('FILA AO VIVO', opts.iconUrl),
        color: paused ? BRAND.amber : BRAND.green,
        description: paused
          ? `**Pausada** — ${PAUSE[paused]}. Quem está buscando continua com o tempo que tinha.`
          : '**No ar** — fechando lobbies agora · *En vivo, cerrando lobbies*',
        image: art.image,
        footer: { text: 'Movimento por posição, nunca quantas pessoas' },
        timestamp: event.occurredAt,
      },
    ],
    components: [
      linkRow([{ label: 'Entrar na fila', url: webLink(opts.webUrl, '/queue'), emoji: '⚽' }]),
    ],
    files: [art.file],
  }
}

/** A public card per closed lobby: how many humans a side, never who. */
export function lobbyClosedMessage(
  event: LobbyClosedEvent,
  opts: { iconUrl?: string } = {},
): BotMessage {
  const a = event.payload.sideA.discordIds.length
  const b = event.payload.sideB.discordIds.length
  const art = picture(
    'lobby.png',
    render(lobbySvg(a, b)),
    `Lobby fechado: ${a} humanos de um lado, ${b} do outro.`,
  )
  return {
    embeds: [
      {
        author: plate('APITO INICIAL', opts.iconUrl),
        color: BRAND.green,
        description: `**Lobby fechado · ${a} × ${b}** — a IA do jogo completa o resto. · *Lobby cerrado.*`,
        image: art.image,
        timestamp: event.occurredAt,
      },
    ],
    files: [art.file],
  }
}

export type QueueStatusDeps = {
  /** `DISCORD_QUEUE_STATUS_CHANNEL_ID`. Unset, the feed is off. */
  channelId?: string
  webUrl?: string
  iconUrl?: () => string | undefined
  /** Edits the board in place, or posts it when there is none yet. */
  upsertBoard: (channelId: string, message: BotMessage) => Promise<void>
  post: (channelId: string, message: BotMessage) => Promise<void>
}

export async function showQueueBoard(event: QueueBoardEvent, deps: QueueStatusDeps): Promise<void> {
  if (!deps.channelId) return
  await deps.upsertBoard(
    deps.channelId,
    boardMessage(event, { webUrl: deps.webUrl, iconUrl: deps.iconUrl?.() }),
  )
}

/**
 * Best effort: the lobby's channels are what matters on `lobby.closed`, so a
 * failed public card must not make the API retry the whole event.
 */
export async function announceLobbyClosed(
  event: LobbyClosedEvent,
  deps: QueueStatusDeps,
  warn: (message: string) => void,
): Promise<void> {
  if (!deps.channelId) return
  await deps
    .post(deps.channelId, lobbyClosedMessage(event, { iconUrl: deps.iconUrl?.() }))
    .catch((error: unknown) => {
      warn(
        `lobby card not posted in #fila-status: ${error instanceof Error ? error.message : error}`,
      )
    })
}
