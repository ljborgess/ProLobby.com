/**
 * Case types that reach moderation — docs/produto/04-governanca/01-moderacao.md.
 * Some are opened by a person, some by the system.
 */
export enum ModerationCaseType {
  SCORE_DISPUTE = 'score_dispute',
  OCR_EXCEPTION = 'ocr_exception',
  USER_REPORT = 'user_report',
  PUNISHMENT_APPEAL = 'punishment_appeal',
  CAPTAIN_ABUSE = 'captain_abuse',
  /** Webhook retry exhausted — the bot never confirmed (RF-058). */
  BOT_DELIVERY_FAILURE = 'bot_delivery_failure',
  /** 5 negative peer ratings in 30 days, from different people. */
  NEGATIVE_RATING_THRESHOLD = 'negative_rating_threshold',
  /** Lost both email and Discord — the two-factor path (RF-025). */
  ACCOUNT_RECOVERY = 'account_recovery',
  GAMERTAG_CHANGE = 'gamertag_change',
  /**
   * Discord identity change — RF-082 / #155. Unlinking is not a self-serve
   * action; the person opens this case. `gamertag_change` is the console
   * counterpart. Both sit under "troca de identidade vinculada" in
   * docs/produto/04-governanca/01-moderacao.md.
   */
  LINKED_IDENTITY_CHANGE = 'linked_identity_change',
  /** Individual score of 0.0 on the screenshot — possibly a game bug (RF-046). */
  POSSIBLE_GAME_BUG = 'possible_game_bug',
  /**
   * A character print waiting for a moderator — #198. Every received print
   * opens one while OCR is not in the flow; afterwards only repeated OCR
   * failures do.
   */
  CHARACTER_VERIFICATION = 'character_verification',
}

export enum ModerationCaseState {
  OPEN = 'open',
  RESOLVED = 'resolved',
  /** Closed without action — counts toward RF-069 when the report was baseless. */
  DISMISSED = 'dismissed',
}

/**
 * Who opened the case. `SYSTEM` exists because several cases have no human
 * author — and RF-068 (max 3 open reports per account) must not count those.
 */
export enum ModerationCaseOrigin {
  SYSTEM = 'system',
  USER = 'user',
  DISCORD_MESSAGE = 'discord_message',
}
