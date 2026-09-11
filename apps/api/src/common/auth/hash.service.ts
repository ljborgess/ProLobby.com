import { Injectable } from '@nestjs/common'
import { hash, verify } from '@node-rs/argon2'

/**
 * Hashing for user secrets — passwords and security answers.
 *
 * Item 10 of the security checklist: never plain text, never a reversible
 * hash, never bare MD5/SHA-1. argon2id with a per-hash salt (@node-rs/argon2
 * generates the salt and embeds it in the output, so there is no separate
 * salt column to store).
 *
 * Lives in `common/auth` because it is not account business logic: the same
 * function serves any comparable secret that shows up later.
 */
@Injectable()
export class HashService {
  async hash(plainText: string): Promise<string> {
    return hash(plainText)
  }

  /**
   * Returns false instead of throwing when the stored hash is malformed or
   * from another algorithm: callers are comparing credentials, and an
   * exception there turns into a 500 where the correct answer is "no match".
   */
  async matches(plainText: string, storedHash: string): Promise<boolean> {
    try {
      return await verify(storedHash, plainText)
    } catch {
      return false
    }
  }
}
