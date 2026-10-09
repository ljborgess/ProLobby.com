import type { ModerationCaseOpenedEvent } from '@prolobby/types'

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
}

export type ModerationAnnounceDeps = {
  /** `DISCORD_MODERATION_CHANNEL_ID`: private, only moderators see it. */
  channelId?: string
  /** The web app, for the link to the panel (`WEB_URL`). */
  webUrl?: string
  send: (channelId: string, content: string) => Promise<void>
  warn: (message: string) => void
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
  const panel = deps.webUrl ? `\n${deps.webUrl.replace(/\/$/, '')}/moderation` : ''
  await deps.send(deps.channelId, `Caso novo de moderação: **${label}**. Meta: 24 h.${panel}`)
}
