/**
 * Why a reputation changed — docs/produto/02-jogador/02-ranking.md and
 * docs/produto/parametros.md ("Eventos que alteram reputação").
 *
 * An enum, not free text, because three rules *count* these rows inside a
 * rolling 30-day window: repeat zero-reports (RF-071), peer negatives, and
 * queue-decline recovery. Counting over a free-text column means every typo
 * silently drops an occurrence.
 */
export enum ReputationEventReason {
  /** +1 per clean match, capped at 70 — the only way back up by playing. */
  CLEAN_MATCH = 'clean_match',
  /** +1 from a teammate; the only path above 70. */
  PEER_THUMBS_UP = 'peer_thumbs_up',
  /** −3 each, escalating by +3 from the third time in 30 days (RF-071). */
  ZERO_REPORT = 'zero_report',
  /** −8, confirmed disconnect or rage quit. */
  DISCONNECT = 'disconnect',
  /** Restore to 45 once a 7-day suspension is served (RF-074). */
  SUSPENSION_SERVED = 'suspension_served',
  /** Manual correction by moderation, always with a case attached. */
  MODERATION_ADJUSTMENT = 'moderation_adjustment',
}

/**
 * Why an elo changed — docs/produto/02-jogador/02-ranking.md.
 *
 * Elo moves only on match results (RF-077), with two exceptions that are not
 * results: the initial seed (a neutral 1000 since the character's overall
 * left the product) and inactivity decay (RF-017). Decay never pushes a
 * character below that baseline.
 */
export enum EloEventReason {
  MATCH_RESULT = 'match_result',
  SEED = 'seed',
  INACTIVITY_DECAY = 'inactivity_decay',
  /** Reversal after moderation overturns a disputed result (RF-044). */
  DISPUTE_ROLLBACK = 'dispute_rollback',
}
