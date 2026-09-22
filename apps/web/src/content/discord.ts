import type { Locale } from './locale'

/**
 * Text for the Discord link screen — #149. One object per locale, so a missing
 * key is a TypeScript error, not a silent blank in production.
 *
 * The `blocked` message names no identity on purpose: saying whether the Discord
 * or the gamertag tripped the ban would turn this screen into an oracle for
 * testing identities one at a time (RF-079).
 */
export interface DiscordContent {
  title: string
  subtitle: string
  linkedLabel: string
  notLinkedLabel: string
  linkedHint: string
  notLinkedHint: string
  /** The one-word state beside the label — the accessible truth, not the colour. */
  linkedState: string
  notLinkedState: string
  /** What the authorization actually asks Discord for, said before leaving. */
  scopeNote: string
  action: string
  acting: string
  statuses: {
    linked: string
    denied: string
    invalid_state: string
    blocked: string
    already_linked: string
    account_already_linked: string
    unavailable: string
    error: string
    networkError: string
  }
}

export const DISCORD_CONTENT: Record<Locale, DiscordContent> = {
  pt: {
    title: 'Discord',
    subtitle: 'A fila e os canais da partida funcionam pelo seu Discord.',
    linkedLabel: 'Discord vinculado',
    notLinkedLabel: 'Discord não vinculado',
    linkedHint: 'Pra trocar de Discord, fale com a moderação.',
    notLinkedHint: 'Você autoriza no Discord e volta pra cá. Só lemos o seu ID.',
    linkedState: 'Concluído',
    notLinkedState: 'Pendente',
    scopeNote:
      'Pedimos só a permissão de identificação. Não lemos suas mensagens nem seus servidores.',
    action: 'Vincular Discord',
    acting: 'Indo pro Discord…',
    statuses: {
      linked: 'Discord vinculado.',
      denied: 'Você cancelou a autorização no Discord. Nada foi vinculado.',
      invalid_state: 'Esse pedido de vínculo venceu ou já foi usado. Tenta de novo.',
      blocked:
        'Não foi possível vincular. Conta bloqueada. Se acha que é um engano, abra uma apelação.',
      already_linked: 'Esse Discord já está vinculado a outra conta.',
      account_already_linked:
        'Sua conta já tem um Discord vinculado. Pra trocar, fale com a moderação.',
      unavailable: 'O vínculo com o Discord está indisponível agora. Tenta de novo mais tarde.',
      error: 'Não deu pra vincular agora. Tenta de novo em instantes.',
      networkError: 'Não deu pra vincular agora. Confere a conexão e tenta de novo.',
    },
  },
  es: {
    title: 'Discord',
    subtitle: 'La cola y los canales del partido funcionan con tu Discord.',
    linkedLabel: 'Discord vinculado',
    notLinkedLabel: 'Discord no vinculado',
    linkedHint: 'Para cambiar de Discord, habla con la moderación.',
    notLinkedHint: 'Autorizas en Discord y vuelves aquí. Solo leemos tu ID.',
    linkedState: 'Completado',
    notLinkedState: 'Pendiente',
    scopeNote:
      'Pedimos solo el permiso de identificación. No leemos tus mensajes ni tus servidores.',
    action: 'Vincular Discord',
    acting: 'Yendo a Discord…',
    statuses: {
      linked: 'Discord vinculado.',
      denied: 'Cancelaste la autorización en Discord. No se vinculó nada.',
      invalid_state: 'Esa solicitud de vínculo venció o ya fue usada. Intenta de nuevo.',
      blocked:
        'No se pudo vincular. Cuenta bloqueada. Si crees que es un error, abre una apelación.',
      already_linked: 'Ese Discord ya está vinculado a otra cuenta.',
      account_already_linked:
        'Tu cuenta ya tiene un Discord vinculado. Para cambiarlo, habla con la moderación.',
      unavailable: 'El vínculo con Discord no está disponible ahora. Intenta más tarde.',
      error: 'No se pudo vincular ahora. Intenta de nuevo en un momento.',
      networkError: 'No se pudo vincular ahora. Revisa la conexión e intenta de nuevo.',
    },
  },
}
