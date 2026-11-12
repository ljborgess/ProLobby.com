import type {
  CaseType,
  ClosureReason,
  Outcome,
  ReportReason,
  SectionKey,
} from '@/modules/moderation/cases'
import type { Locale } from './locale'

/** Text for the case panel of `/moderation` — #309. */
export interface ModerationPanelContent {
  title: string
  sidebarLabel: string
  sample: string
  all: string
  sections: Record<SectionKey, string>
  caseTypes: Record<CaseType, string>
  typeFilter: string
  allTypes: string
  openCount: (open: number) => string
  listLabel: string
  emptySection: string
  overdue: string
  openedAt: string
  noPreview: string
  detailEmpty: string
  loadError: string
  retry: string
  origin: string
  origins: Record<string, string>
  reportReason: string
  reportReasons: Record<ReportReason, string>
  text: string
  lobby: string
  people: string
  roles: { opened_by: string; target: string }
  noCharacter: string
  reputation: string
  history: (open: number, resolved: number, dismissed: number) => string
  discord: string
  close: {
    heading: string
    outcomes: Record<Outcome, string>
    reasonLabel: string
    reasons: Record<ClosureReason, string>
    note: string
    noteHint: (left: number) => string
    confirm: string
    closing: string
    done: string
    alreadyClosed: string
    failed: string
  }
}

export const MODERATION_PANEL_CONTENT: Record<Locale, ModerationPanelContent> = {
  pt: {
    title: 'Painel de moderação',
    sidebarLabel: 'Seções do painel',
    sample: 'Dados de exemplo: a API do painel ainda não está no ar. Nada aqui é de verdade.',
    all: 'Todos',
    sections: {
      verifications: 'Verificações',
      reports: 'Denúncias',
      matches: 'Partidas',
      appeals: 'Apelações',
      support: 'Suporte',
      system: 'Sistema',
    },
    caseTypes: {
      character_verification: 'Personagem',
      ocr_exception: 'Exceção de OCR',
      gamertag_change: 'Troca de gamertag',
      linked_identity_change: 'Troca de identidade vinculada',
      user_report: 'Denúncia de jogador',
      captain_abuse: 'Abuso de capitão',
      negative_rating_threshold: 'Avaliações negativas',
      baseless_reports: 'Denúncias sem fundamento',
      score_dispute: 'Placar contestado',
      possible_game_bug: 'Possível bug do jogo',
      punishment_appeal: 'Apelação de punição',
      support_request: 'Pedido de suporte',
      account_recovery: 'Recuperação de conta',
      bot_delivery_failure: 'Falha de entrega do bot',
    },
    typeFilter: 'Filtrar por tipo',
    allTypes: 'Todos os tipos',
    openCount: (open) => `${open} ${open === 1 ? 'aberto' : 'abertos'}`,
    listLabel: 'Casos, do mais antigo ao mais novo',
    emptySection: 'Nada aberto nesta seção.',
    overdue: 'Atrasado',
    openedAt: 'Aberto em',
    noPreview: 'Sem texto',
    detailEmpty: 'Escolha um caso na lista.',
    loadError: 'Não deu pra carregar os casos.',
    retry: 'Tentar de novo',
    origin: 'Origem',
    origins: { system: 'Sistema', user: 'Jogador', discord_message: 'Mensagem no Discord' },
    reportReason: 'Motivo da denúncia',
    reportReasons: { fraud: 'Fraude', disconnect: 'Desconexão', behavior: 'Comportamento' },
    text: 'Texto do caso',
    lobby: 'Lobby',
    people: 'Pessoas',
    roles: { opened_by: 'Abriu o caso', target: 'Alvo do caso' },
    noCharacter: 'Sem personagem ativo',
    reputation: 'Reputação',
    history: (open, resolved, dismissed) =>
      `Casos: ${open} ${open === 1 ? 'aberto' : 'abertos'}, ${resolved} ${resolved === 1 ? 'procedente' : 'procedentes'}, ${dismissed} ${dismissed === 1 ? 'improcedente' : 'improcedentes'}`,
    discord: 'Discord',
    close: {
      heading: 'Encerrar caso',
      outcomes: { resolved: 'Procedente', dismissed: 'Improcedente' },
      reasonLabel: 'Motivo',
      reasons: {
        confirmed: 'Confirmado',
        handled_elsewhere: 'Ação tomada fora do painel',
        settled_with_person: 'Resolvido com a pessoa',
        no_evidence: 'Sem prova',
        duplicate: 'Duplicado',
        within_rules: 'Não fere as regras',
        already_resolved: 'Já resolvido',
      },
      note: 'Observação (opcional)',
      noteHint: (left) => `${left} caracteres restantes`,
      confirm: 'Confirmar',
      closing: 'Encerrando…',
      done: 'Caso encerrado.',
      alreadyClosed: 'Esse caso já tinha sido encerrado por outra pessoa.',
      failed: 'Não deu pra encerrar. Tenta de novo.',
    },
  },
  es: {
    title: 'Panel de moderación',
    sidebarLabel: 'Secciones del panel',
    sample: 'Datos de ejemplo: la API del panel aún no está en línea. Nada aquí es real.',
    all: 'Todos',
    sections: {
      verifications: 'Verificaciones',
      reports: 'Denuncias',
      matches: 'Partidos',
      appeals: 'Apelaciones',
      support: 'Soporte',
      system: 'Sistema',
    },
    caseTypes: {
      character_verification: 'Personaje',
      ocr_exception: 'Excepción de OCR',
      gamertag_change: 'Cambio de gamertag',
      linked_identity_change: 'Cambio de identidad vinculada',
      user_report: 'Denuncia de jugador',
      captain_abuse: 'Abuso de capitán',
      negative_rating_threshold: 'Valoraciones negativas',
      baseless_reports: 'Denuncias infundadas',
      score_dispute: 'Marcador disputado',
      possible_game_bug: 'Posible bug del juego',
      punishment_appeal: 'Apelación de sanción',
      support_request: 'Solicitud de soporte',
      account_recovery: 'Recuperación de cuenta',
      bot_delivery_failure: 'Fallo de entrega del bot',
    },
    typeFilter: 'Filtrar por tipo',
    allTypes: 'Todos los tipos',
    openCount: (open) => `${open} ${open === 1 ? 'abierto' : 'abiertos'}`,
    listLabel: 'Casos, del más antiguo al más nuevo',
    emptySection: 'Nada abierto en esta sección.',
    overdue: 'Atrasado',
    openedAt: 'Abierto el',
    noPreview: 'Sin texto',
    detailEmpty: 'Elige un caso de la lista.',
    loadError: 'No se pudieron cargar los casos.',
    retry: 'Intentar de nuevo',
    origin: 'Origen',
    origins: { system: 'Sistema', user: 'Jugador', discord_message: 'Mensaje en Discord' },
    reportReason: 'Motivo de la denuncia',
    reportReasons: { fraud: 'Fraude', disconnect: 'Desconexión', behavior: 'Comportamiento' },
    text: 'Texto del caso',
    lobby: 'Lobby',
    people: 'Personas',
    roles: { opened_by: 'Abrió el caso', target: 'Objeto del caso' },
    noCharacter: 'Sin personaje activo',
    reputation: 'Reputación',
    history: (open, resolved, dismissed) =>
      `Casos: ${open} ${open === 1 ? 'abierto' : 'abiertos'}, ${resolved} ${resolved === 1 ? 'procedente' : 'procedentes'}, ${dismissed} ${dismissed === 1 ? 'improcedente' : 'improcedentes'}`,
    discord: 'Discord',
    close: {
      heading: 'Cerrar caso',
      outcomes: { resolved: 'Procedente', dismissed: 'Improcedente' },
      reasonLabel: 'Motivo',
      reasons: {
        confirmed: 'Confirmado',
        handled_elsewhere: 'Acción tomada fuera del panel',
        settled_with_person: 'Resuelto con la persona',
        no_evidence: 'Sin prueba',
        duplicate: 'Duplicado',
        within_rules: 'No infringe las reglas',
        already_resolved: 'Ya resuelto',
      },
      note: 'Observación (opcional)',
      noteHint: (left) => `${left} caracteres restantes`,
      confirm: 'Confirmar',
      closing: 'Cerrando…',
      done: 'Caso cerrado.',
      alreadyClosed: 'Otra persona ya había cerrado este caso.',
      failed: 'No se pudo cerrar. Intenta de nuevo.',
    },
  },
}
