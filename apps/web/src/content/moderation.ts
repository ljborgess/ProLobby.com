import type { Locale } from './locale'

export type ModeratorRejection = 'unreadable' | 'not_active_archetype' | 'archetype_mismatch'

/** Text for `/moderation` — issue #198. */
export interface ModerationContent {
  title: string
  subtitle: string
  empty: string
  declared: string
  printAlt: string
  typedArchetype: string
  typedGamertag: string
  typedGamertagHint: string
  approve: string
  reject: string
  rejectionLabel: string
  rejections: Record<ModeratorRejection, string>
  deciding: string
  approved: string
  rejectedWith: string
  fieldRequired: string
  error: string
}

export const MODERATION_CONTENT: Record<Locale, ModerationContent> = {
  pt: {
    title: 'Verificação de personagens',
    subtitle:
      'Digite o arquétipo e o gamertag que você vê no print. O sistema compara com o que o jogador declarou.',
    empty: 'Nenhum print esperando verificação.',
    declared: 'Declarado',
    printAlt: 'Print da tela de arquétipos enviado pelo jogador',
    typedArchetype: 'Arquétipo no print',
    typedGamertag: 'Gamertag no card',
    typedGamertagHint: 'Exatamente como está embaixo do nome do arquétipo.',
    approve: 'Aprovar',
    reject: 'Recusar',
    rejectionLabel: 'Motivo da recusa',
    rejections: {
      unreadable: 'Ilegível ou não é a tela de arquétipos',
      not_active_archetype: 'Arquétipo aberto não é o ativo (sem ✓)',
      archetype_mismatch: 'Arquétipo não combina com a categoria',
    },
    deciding: 'Salvando…',
    approved: 'Aprovado.',
    rejectedWith: 'Recusado:',
    fieldRequired: 'Preencha este campo.',
    error: 'Não deu pra salvar a decisão. Tenta de novo.',
  },
  es: {
    title: 'Verificación de personajes',
    subtitle:
      'Escribe el arquetipo y el gamertag que ves en la captura. El sistema compara con lo que el jugador declaró.',
    empty: 'Ninguna captura esperando verificación.',
    declared: 'Declarado',
    printAlt: 'Captura de la pantalla de arquetipos enviada por el jugador',
    typedArchetype: 'Arquetipo en la captura',
    typedGamertag: 'Gamertag en la carta',
    typedGamertagHint: 'Exactamente como aparece debajo del nombre del arquetipo.',
    approve: 'Aprobar',
    reject: 'Rechazar',
    rejectionLabel: 'Motivo del rechazo',
    rejections: {
      unreadable: 'Ilegible o no es la pantalla de arquetipos',
      not_active_archetype: 'El arquetipo abierto no es el activo (sin ✓)',
      archetype_mismatch: 'El arquetipo no encaja con la categoría',
    },
    deciding: 'Guardando…',
    approved: 'Aprobado.',
    rejectedWith: 'Rechazado:',
    fieldRequired: 'Completa este campo.',
    error: 'No se pudo guardar la decisión. Intenta de nuevo.',
  },
}
