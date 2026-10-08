import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { CURRENT_EDITION } from '../../common/domain/game-edition.enum'
import { isUniqueViolation } from '../../common/database/postgres-error'
import { Account } from '../account/account.entity'
import { CharacterCategory } from '../character/archetype'
import { ACTIVE_CHARACTER_STATES, Character, CharacterState } from '../character/character.entity'
import { EloService } from '../ranking/elo.service'
import { QueueEntry } from './queue-entry.entity'

/** RF-002, in the order the refusal lists them. */
export type MissingPrerequisite = 'email' | 'character' | 'discord' | 'discord_server'

/**
 * Everything missing at once, never one per attempt (decided 2026-09-09).
 * The character is the one picked, not any: an unverified one cannot play
 * even if a sibling is verified. Left the server is its own reason (RF-060).
 */
export function missingPrerequisites(
  account: Pick<Account, 'emailVerified' | 'discordIdHash' | 'discordPresent'>,
  character: Pick<Character, 'state'>,
): MissingPrerequisite[] {
  const missing: MissingPrerequisite[] = []
  if (!account.emailVerified) missing.push('email')
  if (character.state !== CharacterState.VERIFIED) missing.push('character')
  if (account.discordIdHash == null) missing.push('discord')
  else if (!account.discordPresent) missing.push('discord_server')
  return missing
}

export interface QueueEntryView {
  characterId: string
  category: CharacterCategory
  joinedAt: Date
}

/** Joining and leaving the queue — RF-001, RF-002, RF-003, #228. */
@Injectable()
export class QueueService {
  constructor(
    private readonly em: EntityManager,
    private readonly eloService: EloService,
  ) {}

  async current(accountId: string): Promise<QueueEntryView | null> {
    const entry = await this.em.fork().findOne(QueueEntry, { account: accountId })
    return entry ? toView(entry) : null
  }

  async join(accountId: string, characterId: string): Promise<QueueEntryView> {
    try {
      return await this.em.fork().transactional(async (em) => {
        // The lock every character write takes too, so RF-031 holds: no
        // print or replacement lands between this check and the insert.
        const account = await em.findOneOrFail(
          Account,
          { id: accountId },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        )
        if (await em.count(QueueEntry, { account: accountId })) {
          throw new ConflictException('already_in_queue')
        }
        const character = await em.findOne(Character, {
          id: characterId,
          account: accountId,
          edition: CURRENT_EDITION,
          state: { $in: [...ACTIVE_CHARACTER_STATES] },
        })
        if (!character) {
          throw new NotFoundException('character_not_found')
        }
        const missing = missingPrerequisites(account, character)
        if (missing.length > 0) {
          throw new ForbiddenException({ message: 'queue_prerequisites_missing', missing })
        }

        const entry = em.create(QueueEntry, {
          account,
          character,
          category: character.category,
          eloAtEntry: await this.eloService.ofIn(
            em,
            accountId,
            character.category,
            CURRENT_EDITION,
          ),
        })
        await em.flush()
        return toView(entry)
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('already_in_queue')
      }
      throw error
    }
  }

  /**
   * Frees the account and the character at once; leaving twice is fine. Once
   * placed in a lobby, the way out is refusing it (#232), not leaving: a
   * deleted entry would leave a hole in a roster already formed.
   */
  async leave(accountId: string): Promise<void> {
    const em = this.em.fork()
    const deleted = await em.nativeDelete(QueueEntry, { account: accountId, lobby: null })
    if (deleted === 0 && (await em.count(QueueEntry, { account: accountId }))) {
      throw new ConflictException('queue_entry_in_lobby')
    }
  }
}

function toView(entry: QueueEntry): QueueEntryView {
  return { characterId: entry.character.id, category: entry.category, joinedAt: entry.joinedAt }
}
