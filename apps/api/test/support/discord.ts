import { randomInt, randomUUID } from 'node:crypto'

import {
  encryptAtRest,
  readEvidenceEncryptionKey,
} from '../../src/common/security/evidence-encryption'
import type { Account } from '../../src/modules/account/account.entity'

/**
 * Links a test account to a made-up Discord id, both columns like the real
 * link does: the hash for the queue's prerequisite, the ciphertext for what
 * the bot is sent (`lobby.closed`, #250). Returns the id.
 */
export function linkDiscord(account: Account): string {
  const discordId = `1${String(randomInt(1e9)).padStart(9, '0')}${String(randomInt(1e8)).padStart(8, '0')}`
  account.discordIdHash = randomUUID()
  account.discordIdEncrypted = encryptAtRest(readEvidenceEncryptionKey(), Buffer.from(discordId))
  return discordId
}
