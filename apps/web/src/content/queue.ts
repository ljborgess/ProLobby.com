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
  /** The lobby's steps after the 30 s — #252. */
  lobby: {
    stepClosed: string
    captainTitle: string
    captainBody: (club: string) => string
    captainYes: string
    captainNo: string
    captainFull: string
    captainLeft: string
    captainConfirmed: string
    choosingTitle: string
    choosingHint: string
    inviteTitle: string
    inviteBody: (club: string) => string
    inviteReceived: string
    inviteDone: string
    captainInviteBody: (club: string) => string
    clubFull: string
    clubFullDone: string
    inviteLeft: string
    formationTitle: string
    formationHint: string
    formationLeft: string
    formationNotOpen: string
    formationMine: string
    formationChosen: (formation: string) => string
    formationCaptainPick: string
    formationWaitCaptain: string
    matchTitle: string
    matchHint: string
  }
  /** Back to searching, and why (#252). */
  notice: {
    undone: string
    noFault: string
    byCaptain: string
    dismiss: string
  }
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
    lobby: {
      stepClosed: 'O prazo dessa etapa acabou.',
      captainTitle: 'Você foi chamado pra capitão',
      captainBody: (club) => `O seu lado joga no ${club}. Tem vaga pra todos do lado?`,
      captainYes: 'Tenho vaga',
      captainNo: 'Não tenho',
      captainFull: 'O clube encheu',
      captainLeft: 's pra responder',
      captainConfirmed: 'Você é o capitão. Esperando o capitão do outro lado.',
      choosingTitle: 'Escolhendo os capitães',
      choosingHint: 'Quem tem clube com vaga é chamado, um de cada vez, 30 s pra cada.',
      inviteTitle: 'Convite do clube',
      inviteBody: (club) => `Aceite no console o convite do clube ${club} e marque aqui.`,
      inviteReceived: 'Recebi o convite',
      inviteDone: 'Convite marcado. Esperando os outros receberem.',
      captainInviteBody: (club) => `Convide no console os jogadores do seu lado pro ${club}.`,
      clubFull: 'O clube encheu',
      clubFullDone: 'Você avisou que o clube encheu. Se faltar alguém, ninguém é penalizado.',
      inviteLeft: 'pra todos receberem',
      formationTitle: 'Formação do lado',
      formationHint: 'Vote em uma. Dá pra trocar até o fim do tempo.',
      formationLeft: 's de votação',
      formationNotOpen: 'A votação abre quando os canais do Discord estiverem prontos.',
      formationMine: 'seu voto',
      formationChosen: (formation) => `O lado joga no ${formation}.`,
      formationCaptainPick: 'Deu empate. Como capitão, você escolhe:',
      formationWaitCaptain: 'Deu empate. O capitão do lado escolhe.',
      matchTitle: 'Partida em andamento',
      matchHint: 'Boa partida. O report do placar abre 5 min depois do lobby fechar.',
    },
    notice: {
      undone: 'Alguém não confirmou a partida. Você voltou pra busca, com o tempo que tinha.',
      noFault:
        'O lobby foi cancelado sem culpa de ninguém: faltou capitão ou vaga no clube. Você voltou pra busca, com o tempo que tinha.',
      byCaptain:
        'O lobby foi cancelado porque alguém ficou sem convite, e a moderação vai olhar. Você voltou pra busca, com o tempo que tinha.',
      dismiss: 'Entendi',
    },
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
    lobby: {
      stepClosed: 'Se acabó el plazo de esta etapa.',
      captainTitle: 'Te llamaron para capitán',
      captainBody: (club) => `Tu lado juega en ${club}. ¿Hay lugar para todos del lado?`,
      captainYes: 'Tengo lugar',
      captainNo: 'No tengo',
      captainFull: 'El club se llenó',
      captainLeft: 's para responder',
      captainConfirmed: 'Eres el capitán. Esperando al capitán del otro lado.',
      choosingTitle: 'Eligiendo a los capitanes',
      choosingHint: 'Quien tiene club con lugar es llamado, uno a la vez, 30 s cada uno.',
      inviteTitle: 'Invitación del club',
      inviteBody: (club) => `Acepta en la consola la invitación del club ${club} y márcalo aquí.`,
      inviteReceived: 'Recibí la invitación',
      inviteDone: 'Invitación marcada. Esperando a que los demás la reciban.',
      captainInviteBody: (club) => `Invita en la consola a los jugadores de tu lado a ${club}.`,
      clubFull: 'El club se llenó',
      clubFullDone: 'Avisaste que el club se llenó. Si falta alguien, nadie es penalizado.',
      inviteLeft: 'para que todos la reciban',
      formationTitle: 'Formación del lado',
      formationHint: 'Vota por una. Puedes cambiarla hasta que termine el tiempo.',
      formationLeft: 's de votación',
      formationNotOpen: 'La votación abre cuando los canales de Discord estén listos.',
      formationMine: 'tu voto',
      formationChosen: (formation) => `El lado juega en ${formation}.`,
      formationCaptainPick: 'Hubo empate. Como capitán, eliges tú:',
      formationWaitCaptain: 'Hubo empate. El capitán del lado elige.',
      matchTitle: 'Partido en curso',
      matchHint: 'Buen partido. El reporte del marcador abre 5 min después de que cierre el lobby.',
    },
    notice: {
      undone: 'Alguien no confirmó el partido. Volviste a la búsqueda, con el tiempo que tenías.',
      noFault:
        'El lobby se canceló sin culpa de nadie: faltó capitán o lugar en el club. Volviste a la búsqueda, con el tiempo que tenías.',
      byCaptain:
        'El lobby se canceló porque alguien se quedó sin invitación, y la moderación lo revisará. Volviste a la búsqueda, con el tiempo que tenías.',
      dismiss: 'Entendido',
    },
  },
}
