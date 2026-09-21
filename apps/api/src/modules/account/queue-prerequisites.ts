/**
 * What the queue will demand before it takes someone — RF-002, issue #171.
 *
 * Booleans and nothing else: the screen needs to know *what is missing*, never
 * the email itself or the Discord ID (item 17 of the security checklist).
 *
 * `characterVerified` joins this in phase 2.2, next to the feature that can
 * make it true.
 */
export interface QueuePrerequisites {
  emailVerified: boolean
  discordLinked: boolean
}
