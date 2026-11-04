import type { ModerationCaseClosedEvent } from '@prolobby/types'

import { BRAND, plate, type BotMessage } from '../../discord/brand'

/** What the case was about, in the words of the person who opened it. */
const CASE: Record<string, [string, string]> = {
  user_report: ['sua denúncia', 'tu denuncia'],
  captain_abuse: ['sua denúncia de abuso de capitão', 'tu denuncia de abuso de capitán'],
  score_dispute: ['sua contestação de placar', 'tu impugnación del marcador'],
  possible_game_bug: ['seu aviso de possível bug do jogo', 'tu aviso de posible bug del juego'],
  punishment_appeal: ['sua apelação', 'tu apelación'],
  support_request: ['seu pedido de suporte', 'tu pedido de soporte'],
  account_recovery: ['seu pedido de recuperação de conta', 'tu pedido de recuperación de cuenta'],
  gamertag_change: ['seu pedido de troca de gamertag', 'tu pedido de cambio de gamertag'],
  linked_identity_change: ['seu pedido de troca de Discord', 'tu pedido de cambio de Discord'],
  ocr_exception: ['seu pedido de verificação manual', 'tu pedido de verificación manual'],
}

const REASON: Record<string, [string, string]> = {
  confirmed: ['Confirmado', 'Confirmado'],
  handled_elsewhere: ['Ação tomada', 'Acción tomada'],
  settled_with_person: ['Resolvido com a pessoa', 'Resuelto con la persona'],
  no_evidence: ['Sem prova suficiente', 'Sin prueba suficiente'],
  duplicate: ['Caso duplicado', 'Caso duplicado'],
  within_rules: ['Não fere as regras', 'No infringe las reglas'],
  already_resolved: ['Já estava resolvido', 'Ya estaba resuelto'],
}

/**
 * The DM a person gets when the case they opened is closed (#308): the
 * outcome, the ready reason and the moderator's note. Both languages, like the
 * rest of the bot — the account does not keep one. Nothing about anyone else:
 * the event carries no name, and the reported person never gets this.
 */
export function caseClosedMessage(event: ModerationCaseClosedEvent, iconUrl?: string): BotMessage {
  const { caseType, outcome, reason, note } = event.payload
  const [about, aboutEs] = CASE[caseType] ?? ['seu caso', 'tu caso']
  const [why, whyEs] = REASON[reason] ?? [reason.replace(/_/g, ' '), reason.replace(/_/g, ' ')]
  const resolved = outcome === 'resolved'
  return {
    embeds: [
      {
        author: plate('MODERAÇÃO', iconUrl),
        color: resolved ? BRAND.green : BRAND.amber,
        title: resolved ? '✅ Procedente' : '📁 Improcedente',
        description: [
          `A moderação encerrou ${about}: **${why}**.`,
          `*La moderación cerró ${aboutEs}: ${whyEs}.*`,
        ].join('\n'),
        ...(note ? { fields: [{ name: 'Observação · Observación', value: note }] } : {}),
        footer: { text: 'Dúvida? Escreva em #suporte-e-denuncia' },
        timestamp: event.occurredAt,
      },
    ],
  }
}

export type CaseClosedDeps = {
  /** Sends a DM; resolves `false` when the person does not accept DMs from the server. */
  dm: (userId: string, message: BotMessage) => Promise<boolean>
  iconUrl?: () => string | undefined
  warn: (message: string) => void
}

/**
 * A closed DM is the person's choice, not a failure of the bot: acknowledged
 * and logged, so the API does not open a delivery-failure case over it. Any
 * other error throws, and the API retries as usual.
 */
export async function notifyCaseClosed(
  event: ModerationCaseClosedEvent,
  deps: CaseClosedDeps,
): Promise<void> {
  const delivered = await deps.dm(
    event.payload.discordId,
    caseClosedMessage(event, deps.iconUrl?.()),
  )
  if (!delivered) deps.warn('case closed: the person does not accept DMs, outcome not delivered')
}
