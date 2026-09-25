import type { ReputationBand } from '../ranking/reputation.service'

/**
 * What the queue will demand before it takes someone — RF-002, issue #171.
 *
 * Booleans, plus the reputation: the screen needs to know *what is missing*,
 * never the email itself or the Discord ID (item 17 of the security
 * checklist). The reputation is the account's own number, and under 55 it
 * slows the queue (#208). The web shows it on the queue screen, not on the
 * next-steps panel (decided 2026-09-25); it rides here so the queue can read it.
 *
 * `characterVerified`: at least one verified character in the current edition
 * (phase 2.2, #194). It stays false until the print flow (#195 onward) exists.
 *
 * `discordPresent` is RF-060 (#150): true once linked and stays true until the
 * bot reports a leave. A never-linked account reads it as the entity default
 * (`true`) so it never shows as the blocking case — `discordLinked` already
 * covers "not linked yet".
 */
export interface QueuePrerequisites {
  emailVerified: boolean
  characterVerified: boolean
  discordLinked: boolean
  discordPresent: boolean
  reputation: number
  /** From the number, so the screen never repeats the thresholds. */
  reputationBand: ReputationBand
}
