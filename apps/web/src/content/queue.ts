import type { Locale } from './locale'

export type MovementBand = 'low' | 'busy' | 'full'
export type MissingPrerequisite = 'email' | 'character' | 'discord' | 'discord_server'

/** Text for `/queue` — issue #233. */
export interface QueueContent {
  title: string
  back: string
  pickHeading: string
  noVerified: string
  goToRoster: string
  join: string
  joining: string
  searching: string
  waited: (clock: string) => string
  leave: string
  placedTitle: string
  placedHint: string
  movementHeading: string
  bands: Record<MovementBand, string>
  missingHeading: string
  missing: Record<MissingPrerequisite, string>
  blocked: (minutes: number) => string
  inLobby: string
  error: string
}

export const QUEUE_CONTENT: Record<Locale, QueueContent> = {
  pt: {
    title: 'Fila',
    back: 'Voltar',
    pickHeading: 'Com quem você vai?',
    noVerified: 'Nenhum personagem verificado ainda.',
    goToRoster: 'Ir pro elenco',
    join: 'Entrar na fila',
    joining: 'Entrando…',
    searching: 'Buscando partida',
    waited: (clock) => `Na fila há ${clock}`,
    leave: 'Sair da fila',
    placedTitle: 'Partida encontrada',
    placedHint: 'Esperando a confirmação dos jogadores.',
    movementHeading: 'Movimento agora',
    bands: { low: 'Pouca gente', busy: 'Movimentada', full: 'Cheia' },
    missingHeading: 'Antes de entrar, falta:',
    missing: {
      email: 'Confirmar o e-mail',
      character: 'Verificar este personagem',
      discord: 'Vincular o Discord',
      discord_server: 'Voltar ao servidor do Discord',
    },
    blocked: (minutes) =>
      `Fila bloqueada por mais ${minutes} min, por uma recusa recente de partida.`,
    inLobby: 'Você já está numa partida. Pra sair, recuse a partida.',
    error: 'Não deu pra falar com a fila agora. Tenta de novo em instantes.',
  },
  es: {
    title: 'Cola',
    back: 'Volver',
    pickHeading: '¿Con quién vas?',
    noVerified: 'Todavía no hay personaje verificado.',
    goToRoster: 'Ir a la plantilla',
    join: 'Entrar a la cola',
    joining: 'Entrando…',
    searching: 'Buscando partido',
    waited: (clock) => `En la cola hace ${clock}`,
    leave: 'Salir de la cola',
    placedTitle: 'Partido encontrado',
    placedHint: 'Esperando la confirmación de los jugadores.',
    movementHeading: 'Movimiento ahora',
    bands: { low: 'Poca gente', busy: 'Movida', full: 'Llena' },
    missingHeading: 'Antes de entrar, falta:',
    missing: {
      email: 'Confirmar el correo',
      character: 'Verificar este personaje',
      discord: 'Vincular Discord',
      discord_server: 'Volver al servidor de Discord',
    },
    blocked: (minutes) =>
      `Cola bloqueada por ${minutes} min más, por un rechazo reciente de partido.`,
    inLobby: 'Ya estás en un partido. Para salir, rechaza el partido.',
    error: 'No pudimos hablar con la cola ahora. Inténtalo de nuevo en un momento.',
  },
}
