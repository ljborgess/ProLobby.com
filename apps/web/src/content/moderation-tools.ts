import type { Plan, SuccessBand } from '@/modules/moderation/tools'
import type { Locale } from './locale'

/** Text for the management sections of the panel — #314. */
export interface ModerationToolsContent {
  group: string
  nav: { players: string; audit: string; metrics: string; plans: string }
  loadError: string
  retry: string
  noData: string
  plans: Record<Plan, string>
  caseStates: { open: string; resolved: string; dismissed: string }
  players: {
    searchLabel: string
    searchHint: string
    search: string
    prompt: string
    noResults: string
    results: string
    sheet: string
    characters: string
    noCharacter: string
    reputation: string
    plan: string
    discord: string
    cases: string
    noCases: string
    punishments: string
    noPunishments: string
    punishmentKinds: Record<string, string>
    from: string
    ongoing: string
    state: string
    states: Record<string, string>
    planUntil: string
  }
  audit: {
    readOnly: string
    actor: string
    action: string
    account: string
    invalidId: string
    allActions: string
    actions: Record<string, string>
    filter: string
    when: string
    who: string
    target: string
    caseColumn: string
    before: string
    after: string
    loadMore: string
    loading: string
    empty: string
    system: string
  }
  metrics: {
    beta: string
    success: string
    target: string
    met: string
    notMet: string
    bands: Record<SuccessBand, string>
    noBand: string
    /** The API sends the key, never the words. */
    labels: Record<string, string>
  }
  plan: {
    heading: string
    current: string
    pix: string
    pixHint: string
    pixInvalid: string
    activate: { founder: string; supporter: string }
    revoke: string
    confirmActivate: (plan: string, who: string) => string
    confirmRevoke: (who: string) => string
    confirm: string
    cancel: string
    saving: string
    done: string
    forbidden: string
    accountClosed: string
    alreadyFounder: string
    failed: string
  }
}

export const MODERATION_TOOLS_CONTENT: Record<Locale, ModerationToolsContent> = {
  pt: {
    group: 'Gestão',
    nav: { players: 'Jogadores', audit: 'Auditoria', metrics: 'Métricas', plans: 'Planos' },
    loadError: 'Não deu pra carregar.',
    retry: 'Tentar de novo',
    noData: 'sem dado ainda',
    plans: { founder: 'Fundador', supporter: 'Apoiador', none: 'Sem plano' },
    caseStates: { open: 'Aberto', resolved: 'Procedente', dismissed: 'Improcedente' },
    players: {
      searchLabel: 'Gamertag ou Discord',
      searchHint: 'Busque pelo nome do personagem ou pela menção do Discord.',
      search: 'Buscar',
      prompt: 'Digite um gamertag ou uma menção do Discord.',
      noResults: 'Ninguém encontrado.',
      results: 'Resultados da busca',
      sheet: 'Ficha do jogador',
      characters: 'Personagens',
      noCharacter: 'Sem personagem ativo',
      reputation: 'Reputação',
      plan: 'Plano',
      discord: 'Discord',
      cases: 'Casos',
      noCases: 'Nenhum caso.',
      punishments: 'Punições',
      noPunishments: 'Nenhuma punição.',
      punishmentKinds: { suspension: 'Suspensão', ban: 'Banimento' },
      from: 'aberta em',
      ongoing: 'sem decisão ainda',
      state: 'Estado',
      states: { active: 'Ativa', suspended: 'Suspensa', banned: 'Banida' },
      planUntil: 'até',
    },
    audit: {
      readOnly: 'Só leitura: nada aqui se edita nem se apaga.',
      actor: 'Moderador (ID)',
      action: 'Ação',
      account: 'Conta afetada (ID)',
      invalidId: 'O ID da conta é um UUID.',
      allActions: 'Todas as ações',
      actions: {
        role_changed: 'Papel alterado',
        case_resolved: 'Caso encerrado',
        plan_changed: 'Plano alterado',
        player_searched: 'Jogador buscado',
        two_factor_enrollment: 'Cadastro de 2FA',
        recovery_code_used: 'Código de recuperação usado',
      },
      filter: 'Filtrar',
      when: 'Quando',
      who: 'Quem',
      target: 'Conta',
      caseColumn: 'Caso',
      before: 'Antes',
      after: 'Depois',
      loadMore: 'Carregar mais',
      loading: 'Carregando…',
      empty: 'Nenhuma entrada com esses filtros.',
      system: 'sistema',
    },
    metrics: {
      beta: 'Critérios de saída do beta',
      success: 'Métricas de sucesso',
      target: 'Meta',
      met: 'Meta batida',
      notMet: 'Meta não batida',
      bands: { worked: 'Funcionou', ambiguous: 'Ambíguo', failed: 'Não funcionou' },
      noBand: 'sem faixa ainda',
      labels: {
        matches_completed: 'Partidas concluídas',
        announced_night_closed: 'Noite anunciada fechada',
        unannounced_night_closed: 'Noite sem anúncio fechada',
        strangers_share: 'Jogadores sem grupo prévio (%)',
        ocr_first_pass: 'Placares lidos de primeira (%)',
        lobbies_cancelled_by_bug: 'Lobbies cancelados por bug',
        matches_per_week: 'Partidas na última semana',
        confirmed_without_dispute: 'Confirmadas sem disputa (%)',
        returned_for_second: 'Voltaram pra segunda partida (%)',
      },
    },
    plan: {
      heading: 'Plano do jogador',
      current: 'Plano atual',
      pix: 'Identificador do PIX',
      pixHint: 'Obrigatório pra ativar: 8 a 64 letras, números ou hífen.',
      pixInvalid: 'Identificador inválido: use 8 a 64 letras, números ou hífen.',
      activate: { founder: 'Ativar Fundador', supporter: 'Ativar Apoiador' },
      revoke: 'Revogar',
      confirmActivate: (plan, who) => `Ativar ${plan} para ${who}?`,
      confirmRevoke: (who) => `Revogar o plano de ${who}?`,
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      saving: 'Salvando…',
      done: 'Plano atualizado.',
      forbidden: 'Só admin muda plano.',
      accountClosed: 'Conta banida ou apagada: o plano não muda.',
      alreadyFounder: 'Fundador não vira Apoiador.',
      failed: 'Não deu pra salvar. Tenta de novo.',
    },
  },
  es: {
    group: 'Gestión',
    nav: { players: 'Jugadores', audit: 'Auditoría', metrics: 'Métricas', plans: 'Planes' },
    loadError: 'No se pudo cargar.',
    retry: 'Intentar de nuevo',
    noData: 'sin datos aún',
    plans: { founder: 'Fundador', supporter: 'Aportante', none: 'Sin plan' },
    caseStates: { open: 'Abierto', resolved: 'Procedente', dismissed: 'Improcedente' },
    players: {
      searchLabel: 'Gamertag o Discord',
      searchHint: 'Busca por el nombre del personaje o por la mención de Discord.',
      search: 'Buscar',
      prompt: 'Escribe un gamertag o una mención de Discord.',
      noResults: 'No se encontró a nadie.',
      results: 'Resultados de la búsqueda',
      sheet: 'Ficha del jugador',
      characters: 'Personajes',
      noCharacter: 'Sin personaje activo',
      reputation: 'Reputación',
      plan: 'Plan',
      discord: 'Discord',
      cases: 'Casos',
      noCases: 'Ningún caso.',
      punishments: 'Sanciones',
      noPunishments: 'Ninguna sanción.',
      punishmentKinds: { suspension: 'Suspensión', ban: 'Baneo' },
      from: 'abierta el',
      ongoing: 'sin decisión aún',
      state: 'Estado',
      states: { active: 'Activa', suspended: 'Suspendida', banned: 'Baneada' },
      planUntil: 'hasta',
    },
    audit: {
      readOnly: 'Solo lectura: nada aquí se edita ni se borra.',
      actor: 'Moderador (ID)',
      action: 'Acción',
      account: 'Cuenta afectada (ID)',
      invalidId: 'El ID de la cuenta es un UUID.',
      allActions: 'Todas las acciones',
      actions: {
        role_changed: 'Rol cambiado',
        case_resolved: 'Caso cerrado',
        plan_changed: 'Plan cambiado',
        player_searched: 'Jugador buscado',
        two_factor_enrollment: 'Registro de 2FA',
        recovery_code_used: 'Código de recuperación usado',
      },
      filter: 'Filtrar',
      when: 'Cuándo',
      who: 'Quién',
      target: 'Cuenta',
      caseColumn: 'Caso',
      before: 'Antes',
      after: 'Después',
      loadMore: 'Cargar más',
      loading: 'Cargando…',
      empty: 'Ninguna entrada con esos filtros.',
      system: 'sistema',
    },
    metrics: {
      beta: 'Criterios de salida del beta',
      success: 'Métricas de éxito',
      target: 'Meta',
      met: 'Meta alcanzada',
      notMet: 'Meta no alcanzada',
      bands: { worked: 'Funcionó', ambiguous: 'Ambiguo', failed: 'No funcionó' },
      noBand: 'sin franja aún',
      labels: {
        matches_completed: 'Partidos completados',
        announced_night_closed: 'Noche anunciada cerrada',
        unannounced_night_closed: 'Noche sin anuncio cerrada',
        strangers_share: 'Jugadores sin grupo previo (%)',
        ocr_first_pass: 'Marcadores leídos al primer intento (%)',
        lobbies_cancelled_by_bug: 'Lobbies cancelados por bug',
        matches_per_week: 'Partidos en la última semana',
        confirmed_without_dispute: 'Confirmados sin disputa (%)',
        returned_for_second: 'Volvieron por el segundo partido (%)',
      },
    },
    plan: {
      heading: 'Plan del jugador',
      current: 'Plan actual',
      pix: 'Identificador del PIX',
      pixHint: 'Obligatorio para activar: 8 a 64 letras, números o guion.',
      pixInvalid: 'Identificador inválido: usa 8 a 64 letras, números o guion.',
      activate: { founder: 'Activar Fundador', supporter: 'Activar Aportante' },
      revoke: 'Revocar',
      confirmActivate: (plan, who) => `¿Activar ${plan} para ${who}?`,
      confirmRevoke: (who) => `¿Revocar el plan de ${who}?`,
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      saving: 'Guardando…',
      done: 'Plan actualizado.',
      forbidden: 'Solo un admin cambia planes.',
      accountClosed: 'Cuenta baneada o borrada: el plan no cambia.',
      alreadyFounder: 'Un Fundador no pasa a Aportante.',
      failed: 'No se pudo guardar. Intenta de nuevo.',
    },
  },
}
