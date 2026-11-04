import type { ModerationCaseOpenedEvent } from '@prolobby/types'

import { BRAND, linkRow, plate, webLink, type BotMessage } from '../../discord/brand'

/** How each kind of case reads in the moderators' channel. */
const CASE_LABEL: Record<string, string> = {
  character_verification: 'verificação de personagem',
  account_recovery: 'recuperação de conta',
  punishment_appeal: 'apelação de punição',
  score_dispute: 'disputa de placar',
  ocr_exception: 'exceção de OCR',
  user_report: 'denúncia',
  captain_abuse: 'abuso de capitão',
  negative_rating_threshold: 'limite de avaliações negativas',
  gamertag_change: 'troca de gamertag',
  linked_identity_change: 'troca de identidade vinculada',
  possible_game_bug: 'possível bug do jogo',
  support_request: 'suporte pelo Discord',
}

export type ModerationAnnounceDeps = {
  /** `DISCORD_MODERATION_CHANNEL_ID`: private, only moderators see it. */
  channelId?: string
  /** The web app, for the link to the panel (`WEB_URL`). */
  webUrl?: string
  iconUrl?: () => string | undefined
  send: (channelId: string, message: BotMessage) => Promise<void>
  warn: (message: string) => void
}

/** A card for the team: the kind of case, the 24 h goal, the way to the panel. */
export function caseMessage(
  label: string,
  occurredAt: string,
  opts: { webUrl?: string; iconUrl?: string } = {},
): BotMessage {
  return {
    embeds: [
      {
        author: plate('MODERAÇÃO', opts.iconUrl),
        color: BRAND.amber,
        title: `Caso novo: ${label}`,
        fields: [{ name: 'Meta', value: 'resposta em até 24 h', inline: true }],
        footer: { text: 'Os detalhes ficam no painel, atrás do login do moderador' },
        timestamp: occurredAt,
      },
    ],
    components: [
      linkRow([{ label: 'Abrir painel', url: webLink(opts.webUrl, '/moderation'), emoji: '🛡️' }]),
    ],
  }
}

/**
 * #226: tells the moderators a case is waiting. Only the kind of case and
 * the link — the event carries no gamertag, email or print, and the panel is
 * where the details are, behind the moderator's own session.
 *
 * In Portuguese only: the channel is the team's, not a player-facing message
 * (RNF-016 covers what players read).
 *
 * Without a channel configured there is nowhere to post, and retrying will
 * not create one: warn and accept, so the API does not open a delivery
 * failure case for a missing setting.
 */
export async function announceModerationCase(
  event: ModerationCaseOpenedEvent,
  deps: ModerationAnnounceDeps,
): Promise<void> {
  if (!deps.channelId) {
    deps.warn('DISCORD_MODERATION_CHANNEL_ID is not set: moderation case not announced')
    return
  }
  const label = CASE_LABEL[event.payload.caseType] ?? event.payload.caseType.replace(/_/g, ' ')
  await deps.send(
    deps.channelId,
    caseMessage(label, event.occurredAt, { webUrl: deps.webUrl, iconUrl: deps.iconUrl?.() }),
  )
}
