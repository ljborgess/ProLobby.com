import type { Locale } from './locale'

export type MovementBand = 'low' | 'busy' | 'full'
export type MissingPrerequisite = 'email' | 'character' | 'discord' | 'discord_server'

/** Text for `/queue` — issue #233. */
export interface QueueContent {
  title: string
  back: string
  pickHeading: string
  noCharacterHere: string
  noVerified: string
  goToRoster: string
  join: string
  joinAs: (code: string) => string
  joining: string
  searching: string
  waited: (clock: string) => string
  /** RF-003: the elo band the search accepts right now. */
  band: (points: number) => string
  bandWidens: string
  leave: string
  placedTitle: string
  placedHint: string
  secondsLeft: string
  previous: string
  next: string
  accept: string
  refuse: string
  confirmed: string
  answerClosed: string
  movementHeading: string
  bands: Record<MovementBand, string>
  missingHeading: string
  missing: Record<MissingPrerequisite, string>
  blockedTitle: string
  blockedHint: string
  blocked: (minutes: number) => string
  inLobby: string
  error: string
}

export const QUEUE_CONTENT: Record<Locale, QueueContent> = {
  pt: {
    title: 'Fila',
    back: 'Voltar',
    pickHeading: 'Escolha com quem você vai',
    noCharacterHere: 'sem personagem',
    noVerified: 'Nenhum personagem verificado ainda.',
    goToRoster: 'Ir pro elenco',
    join: 'Entrar na fila',
    joinAs: (code) => `Entrar na fila como ${code}`,
    joining: 'Entrando…',
    searching: 'Buscando partida',
    waited: (clock) => `Na fila há ${clock}`,
    band: (points) => `Banda de elo ±${points}`,
    bandWidens: 'Abre 50 a cada 2 min, até ±400.',
    leave: 'Sair da fila',
    placedTitle: 'Partida encontrada',
    placedHint: 'Esperando a confirmação dos jogadores.',
    secondsLeft: 's pra confirmar',
    previous: 'Armário anterior',
    next: 'Próximo armário',
    accept: 'Aceitar',
    refuse: 'Recusar',
    confirmed: 'Confirmado. Esperando os outros jogadores.',
    answerClosed: 'O tempo pra responder acabou.',
    movementHeading: 'Movimento agora',
    bands: { low: 'Pouca gente', busy: 'Movimentada', full: 'Cheia' },
    missingHeading: 'Antes de entrar, falta:',
    missing: {
      email: 'Confirmar o e-mail',
      character: 'Verificar este personagem',
      discord: 'Vincular o Discord',
      discord_server: 'Voltar ao servidor do Discord',
    },
    blockedTitle: 'Fila bloqueada',
    blockedHint: 'Por uma recusa recente de partida. Libera sozinha.',
    blocked: (minutes) =>
      `Fila bloqueada por mais ${minutes} min, por uma recusa recente de partida.`,
    inLobby: 'Você já está numa partida. Pra sair, recuse a partida.',
    error: 'Não deu pra falar com a fila agora. Tenta de novo em instantes.',
  },
  es: {
    title: 'Cola',
    back: 'Volver',
    pickHeading: 'Elige con quién vas',
    noCharacterHere: 'sin personaje',
    noVerified: 'Todavía no hay personaje verificado.',
    goToRoster: 'Ir a la plantilla',
    join: 'Entrar a la cola',
    joinAs: (code) => `Entrar a la cola como ${code}`,
    joining: 'Entrando…',
    searching: 'Buscando partido',
    waited: (clock) => `En la cola hace ${clock}`,
    band: (points) => `Franja de elo ±${points}`,
    bandWidens: 'Se abre 50 cada 2 min, hasta ±400.',
    leave: 'Salir de la cola',
    placedTitle: 'Partido encontrado',
    placedHint: 'Esperando la confirmación de los jugadores.',
    secondsLeft: 's para confirmar',
    previous: 'Casillero anterior',
    next: 'Siguiente casillero',
    accept: 'Aceptar',
    refuse: 'Rechazar',
    confirmed: 'Confirmado. Esperando a los demás jugadores.',
    answerClosed: 'Se acabó el tiempo para responder.',
    movementHeading: 'Movimiento ahora',
    bands: { low: 'Poca gente', busy: 'Movida', full: 'Llena' },
    missingHeading: 'Antes de entrar, falta:',
    missing: {
      email: 'Confirmar el correo',
      character: 'Verificar este personaje',
      discord: 'Vincular Discord',
      discord_server: 'Volver al servidor de Discord',
    },
    blockedTitle: 'Cola bloqueada',
    blockedHint: 'Por un rechazo reciente de partido. Se libera sola.',
    blocked: (minutes) =>
      `Cola bloqueada por ${minutes} min más, por un rechazo reciente de partido.`,
    inLobby: 'Ya estás en un partido. Para salir, rechaza el partido.',
    error: 'No pudimos hablar con la cola ahora. Inténtalo de nuevo en un momento.',
  },
}
