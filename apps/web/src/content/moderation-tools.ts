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
    until: string
    ongoing: string
  }
  audit: {
    readOnly: string
    actor: string
    action: string
    account: string
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
  }
  plan: {
    heading: string
    current: string
    pix: string
    pixHint: string
    pixRequired: string
    activate: { founder: string; supporter: string }
    revoke: string
    confirmActivate: (plan: string, who: string) => string
    confirmRevoke: (who: string) => string
    confirm: string
    cancel: string
    saving: string
    done: string
    forbidden: string
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
      from: 'desde',
      until: 'até',
      ongoing: 'em vigor',
    },
    audit: {
      readOnly: 'Só leitura: nada aqui se edita nem se apaga.',
      actor: 'Moderador',
      action: 'Ação',
      account: 'Conta afetada',
      allActions: 'Todas as ações',
      actions: {
        role_changed: 'Papel alterado',
        case_resolved: 'Caso encerrado',
        plan_changed: 'Plano alterado',
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
    },
    plan: {
      heading: 'Plano do jogador',
      current: 'Plano atual',
      pix: 'Identificador do PIX',
      pixHint: 'Obrigatório pra ativar um plano.',
      pixRequired: 'Informe o identificador do PIX.',
      activate: { founder: 'Ativar Fundador', supporter: 'Ativar Apoiador' },
      revoke: 'Revogar',
      confirmActivate: (plan, who) => `Ativar ${plan} para ${who}?`,
      confirmRevoke: (who) => `Revogar o plano de ${who}?`,
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      saving: 'Salvando…',
      done: 'Plano atualizado.',
      forbidden: 'Só admin muda plano.',
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
      from: 'desde',
      until: 'hasta',
      ongoing: 'vigente',
    },
    audit: {
      readOnly: 'Solo lectura: nada aquí se edita ni se borra.',
      actor: 'Moderador',
      action: 'Acción',
      account: 'Cuenta afectada',
      allActions: 'Todas las acciones',
      actions: {
        role_changed: 'Rol cambiado',
        case_resolved: 'Caso cerrado',
        plan_changed: 'Plan cambiado',
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
    },
    plan: {
      heading: 'Plan del jugador',
      current: 'Plan actual',
      pix: 'Identificador del PIX',
      pixHint: 'Obligatorio para activar un plan.',
      pixRequired: 'Indica el identificador del PIX.',
      activate: { founder: 'Activar Fundador', supporter: 'Activar Aportante' },
      revoke: 'Revocar',
      confirmActivate: (plan, who) => `¿Activar ${plan} para ${who}?`,
      confirmRevoke: (who) => `¿Revocar el plan de ${who}?`,
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      saving: 'Guardando…',
      done: 'Plan actualizado.',
      forbidden: 'Solo un admin cambia planes.',
      failed: 'No se pudo guardar. Intenta de nuevo.',
    },
  },
}
