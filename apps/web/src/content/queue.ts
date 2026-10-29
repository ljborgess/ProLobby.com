import type { Locale } from './locale'

export type MovementBand = 'low' | 'busy' | 'full'
export type MissingPrerequisite = 'email' | 'character' | 'discord' | 'discord_server'
export type UserReportReason = 'fraud' | 'disconnect' | 'behavior'

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
  /** Before refusing in the 30 s: the block it costs (RF-009, #234). */
  refuseWarning: (minutes: number) => string
  refuseConfirm: string
  refuseBack: string
  /** 10 min searching with no lobby: what is missing, every 5 min (RF-007, #234). */
  stall: { unpaired: string; captain_missing: string; keepWaiting: string }
  /** No lobby closes right now, and why (RNF-008, #271); the search goes on. */
  paused: { discord_unavailable: string; channels_full: string; lobbies_full: string }
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
    captainWithdraw: string
    /** RF-032: the withdrawal arrived after both captains had confirmed. */
    withdrawClosed: string
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
    formationCounting: string
    matchTitle: string
  }
  /** The result: report, contest, rating and report of a person (4.1, 4.2). */
  result: {
    reportOpensIn: (clock: string) => string
    reportTitle: string
    mine: string
    theirs: string
    printLabel: string
    printHint: string
    absentLegend: string
    absentHint: string
    teammate: string
    opponent: string
    send: string
    sending: string
    sent: (mine: number, theirs: number) => string
    otherSideBy: (clock: string) => string
    correct: string
    saveCorrection: string
    cancel: string
    /** By the API's message; `generic` for anything else. */
    errors: Record<string, string>
    disputeTitle: string
    disputeHint: string
    lastTitle: string
    states: Record<string, string>
    contest: string
    contestUntil: (hours: number) => string
    rateTitle: string
    rateHint: string
    thumbsUp: string
    negative: string
    reportPerson: string
    person: string
    reason: string
    reasons: Record<UserReportReason, string>
    message: string
    messageHint: string
    reportSend: string
    reportSent: string
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
    refuseWarning: (minutes) =>
      `Recusar te bloqueia da fila por ${minutes} min. A recusa sobe o bloqueio enquanto você recusar em menos de 12 h.`,
    refuseConfirm: 'Recusar mesmo',
    refuseBack: 'Voltar',
    paused: {
      discord_unavailable:
        'Coordenação indisponível: o Discord está fora do ar. Nenhum lobby fecha agora; sua busca continua e volta sozinha.',
      channels_full:
        'O servidor do Discord está sem espaço pra canais novos. Nenhum lobby fecha agora; sua busca continua e volta sozinha.',
      lobbies_full:
        'Muitos lobbies ao mesmo tempo. O próximo fecha assim que um terminar; sua busca continua.',
    },
    stall: {
      unpaired: 'A fila está parada porque falta alguém da sua posição pra formar par com você.',
      captain_missing:
        'A fila está parada porque falta capitão: ninguém na busca declarou clube com vaga pra um dos lados.',
      keepWaiting: 'Continuar esperando',
    },
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
      captainWithdraw: 'Desistir de ser capitão',
      withdrawClosed: 'O outro capitão confirmou antes: o lobby já seguiu pro convite.',
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
      formationCaptainPick: 'A votação não teve vencedora. Como capitão, você escolhe:',
      formationWaitCaptain: 'A votação não teve vencedora. O capitão do lado escolhe.',
      formationCounting: 'Votação encerrada. Contando os votos.',
      matchTitle: 'Partida em andamento',
    },
    result: {
      reportOpensIn: (clock) => `O report do placar abre em ${clock}.`,
      reportTitle: 'Placar final',
      mine: 'Seu lado',
      theirs: 'Adversário',
      printLabel: 'Print da tela de fim de partida',
      printHint: 'JPG, PNG ou WebP, até 10 MB. A tela com o placar e as estatísticas.',
      absentLegend: 'Alguém saiu ou não jogou?',
      absentHint: 'Marque só quem faltou. Confirmado pelo outro lado, custa −8 de reputação.',
      teammate: 'seu lado',
      opponent: 'adversário',
      send: 'Enviar placar',
      sending: 'Enviando…',
      sent: (mine, theirs) => `Você reportou ${mine} × ${theirs}.`,
      otherSideBy: (clock) => `O outro lado tem ${clock} pra reportar.`,
      correct: 'Corrigir placar',
      saveCorrection: 'Salvar correção',
      cancel: 'Cancelar',
      errors: {
        print_required: 'Escolha o print do placar.',
        invalid_format: 'Esse arquivo não é uma imagem JPG, PNG ou WebP.',
        image_too_small: 'Imagem pequena demais. Mande o print na resolução da tela.',
        print_already_used: 'Esse print já foi usado em outra partida.',
        report_exists: 'Você já reportou essa partida.',
        report_too_early: 'Ainda não dá pra reportar. Espera o tempo acabar.',
        report_closed: 'O prazo pra reportar ou corrigir acabou.',
        absent_not_in_match: 'Uma das pessoas marcadas não está nessa partida.',
        payload_too_large: 'Arquivo grande demais: até 10 MB.',
        message_too_short: 'Escreva pelo menos 20 caracteres contando o que aconteceu.',
        contest_exists: 'Você já contestou essa partida.',
        contest_closed: 'O prazo pra contestar acabou.',
        rating_closed: 'A avaliação dessa partida fechou.',
        rating_exists: 'Você já avaliou essa pessoa nessa partida.',
        too_many_open_reports:
          'Você já tem 3 denúncias abertas. Espera a moderação decidir alguma.',
        generic: 'Não deu certo agora. Tenta de novo em instantes.',
      },
      disputeTitle: 'Placar em disputa',
      disputeHint: 'Os placares não bateram. A moderação decide, e a fila fica presa até lá.',
      lastTitle: 'Última partida',
      states: {
        finished: 'Resultado confirmado.',
        not_confirmed: 'Só um lado reportou. Vira definitivo em 48 h se ninguém contestar.',
        in_dispute: 'Em disputa: a moderação decide.',
        expired_no_report: 'Ninguém reportou o placar em 60 min: −3 de reputação pra cada um.',
      },
      contest: 'Contestar resultado',
      contestUntil: (hours) => `Dá pra contestar por mais ${hours} h.`,
      rateTitle: 'Avalie seu lado',
      rateHint: 'Opcional, e ninguém fica sabendo quem avaliou quem.',
      thumbsUp: 'Jogou bem',
      negative: 'Não colaborou',
      reportPerson: 'Denunciar alguém',
      person: 'Quem',
      reason: 'Motivo',
      reasons: { fraud: 'Fraude', disconnect: 'Desconexão', behavior: 'Comportamento' },
      message: 'O que aconteceu',
      messageHint: 'De 20 a 2000 caracteres. A pessoa nunca sabe quem denunciou.',
      reportSend: 'Enviar denúncia',
      reportSent: 'Denúncia enviada pra moderação.',
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
    refuseWarning: (minutes) =>
      `Rechazar te bloquea de la cola por ${minutes} min. El bloqueo sube mientras rechaces con menos de 12 h de diferencia.`,
    refuseConfirm: 'Rechazar igual',
    refuseBack: 'Volver',
    paused: {
      discord_unavailable:
        'Coordinación no disponible: Discord está caído. Ningún lobby se cierra ahora; tu búsqueda sigue y vuelve sola.',
      channels_full:
        'El servidor de Discord no tiene espacio para canales nuevos. Ningún lobby se cierra ahora; tu búsqueda sigue y vuelve sola.',
      lobbies_full:
        'Muchos lobbies al mismo tiempo. El próximo se cierra apenas termine uno; tu búsqueda sigue.',
    },
    stall: {
      unpaired:
        'La cola está parada porque falta alguien de tu posición para formar pareja contigo.',
      captain_missing:
        'La cola está parada porque falta capitán: nadie en la búsqueda declaró un club con plazas para uno de los lados.',
      keepWaiting: 'Seguir esperando',
    },
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
      captainWithdraw: 'Dejar de ser capitán',
      withdrawClosed: 'El otro capitán confirmó antes: el lobby ya pasó a la invitación.',
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
      formationCaptainPick: 'La votación no tuvo ganadora. Como capitán, eliges tú:',
      formationWaitCaptain: 'La votación no tuvo ganadora. El capitán del lado elige.',
      formationCounting: 'Votación cerrada. Contando los votos.',
      matchTitle: 'Partido en curso',
    },
    result: {
      reportOpensIn: (clock) => `El reporte del marcador abre en ${clock}.`,
      reportTitle: 'Marcador final',
      mine: 'Tu lado',
      theirs: 'Rival',
      printLabel: 'Captura de la pantalla de fin de partido',
      printHint: 'JPG, PNG o WebP, hasta 10 MB. La pantalla con el marcador y las estadísticas.',
      absentLegend: '¿Alguien se fue o no jugó?',
      absentHint: 'Marca solo a quien faltó. Si el otro lado lo confirma, cuesta −8 de reputación.',
      teammate: 'tu lado',
      opponent: 'rival',
      send: 'Enviar marcador',
      sending: 'Enviando…',
      sent: (mine, theirs) => `Reportaste ${mine} × ${theirs}.`,
      otherSideBy: (clock) => `El otro lado tiene ${clock} para reportar.`,
      correct: 'Corregir marcador',
      saveCorrection: 'Guardar corrección',
      cancel: 'Cancelar',
      errors: {
        print_required: 'Elige la captura del marcador.',
        invalid_format: 'Ese archivo no es una imagen JPG, PNG o WebP.',
        image_too_small:
          'Imagen demasiado pequeña. Envía la captura en la resolución de la pantalla.',
        print_already_used: 'Esa captura ya se usó en otro partido.',
        report_exists: 'Ya reportaste este partido.',
        report_too_early: 'Todavía no se puede reportar. Espera a que termine el tiempo.',
        report_closed: 'Se acabó el plazo para reportar o corregir.',
        absent_not_in_match: 'Una de las personas marcadas no está en este partido.',
        payload_too_large: 'Archivo demasiado grande: hasta 10 MB.',
        message_too_short: 'Escribe al menos 20 caracteres contando lo que pasó.',
        contest_exists: 'Ya impugnaste este partido.',
        contest_closed: 'Se acabó el plazo para impugnar.',
        rating_closed: 'La evaluación de este partido cerró.',
        rating_exists: 'Ya evaluaste a esta persona en este partido.',
        too_many_open_reports:
          'Ya tienes 3 denuncias abiertas. Espera a que la moderación decida alguna.',
        generic: 'No funcionó ahora. Inténtalo de nuevo en un momento.',
      },
      disputeTitle: 'Marcador en disputa',
      disputeHint:
        'Los marcadores no coincidieron. La moderación decide, y la cola queda trabada hasta entonces.',
      lastTitle: 'Último partido',
      states: {
        finished: 'Resultado confirmado.',
        not_confirmed: 'Solo un lado reportó. Queda definitivo en 48 h si nadie impugna.',
        in_dispute: 'En disputa: la moderación decide.',
        expired_no_report: 'Nadie reportó el marcador en 60 min: −3 de reputación para cada uno.',
      },
      contest: 'Impugnar resultado',
      contestUntil: (hours) => `Puedes impugnar por ${hours} h más.`,
      rateTitle: 'Evalúa a tu lado',
      rateHint: 'Opcional, y nadie sabe quién evaluó a quién.',
      thumbsUp: 'Jugó bien',
      negative: 'No colaboró',
      reportPerson: 'Denunciar a alguien',
      person: 'Quién',
      reason: 'Motivo',
      reasons: { fraud: 'Fraude', disconnect: 'Desconexión', behavior: 'Comportamiento' },
      message: 'Qué pasó',
      messageHint: 'De 20 a 2000 caracteres. La persona nunca sabe quién la denunció.',
      reportSend: 'Enviar denuncia',
      reportSent: 'Denuncia enviada a la moderación.',
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
