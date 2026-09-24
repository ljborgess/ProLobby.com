import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { isUniqueViolation } from '../../common/database/postgres-error'
import { CURRENT_EDITION } from '../../common/domain/game-edition.enum'
import { encryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import { hashGamertag, readIdentityHmacSecret } from '../../common/security/identity-hmac'
import { Account } from '../account/account.entity'
import { archetypeFitsCategory } from './archetype'
import { ACTIVE_CHARACTER_STATES, Character, CharacterState } from './character.entity'
import type { ChangeCategoryDto } from './dto/change-category.dto'
import type { CreateCharacterDto } from './dto/create-character.dto'
import { PlatformGamertag } from './platform-gamertag.entity'
import { PrintRejection, PrintSubmission, PrintSubmissionStatus } from './print-submission.entity'

/**
 * Characters one account may create per hour. The per-IP throttle alone lets
 * one account past it from another address; this one follows the account.
 * Each creation inactivates the previous character and keeps it (RF-027).
 */
export const CHARACTER_CREATIONS_PER_HOUR = 10
const HOUR_MS = 60 * 60 * 1000

/** What the screen needs about a character — item 17: never the entity. */
export type CharacterView = Pick<
  Character,
  'id' | 'category' | 'archetype' | 'platform' | 'edition' | 'name' | 'state' | 'matchesInCategory'
>

/**
 * The list also says what happened to the latest print: with no notification
 * system yet, the character screen is where a rejection reaches the player.
 */
export type CharacterListItem = CharacterView & {
  lastPrint: { status: PrintSubmissionStatus; rejection: PrintRejection | null } | null
}

@Injectable()
export class CharacterService {
  private readonly hmacSecret = readIdentityHmacSecret()
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(private readonly em: EntityManager) {}

  async list(accountId: string): Promise<CharacterListItem[]> {
    const em = this.em.fork()
    const characters = await em.find(
      Character,
      {
        account: accountId,
        edition: CURRENT_EDITION,
        state: { $in: [...ACTIVE_CHARACTER_STATES] },
      },
      { orderBy: { createdAt: 'asc' } },
    )
    const prints = await em.find(
      PrintSubmission,
      { character: { $in: characters.map((character) => character.id) } },
      { orderBy: { createdAt: 'desc' } },
    )
    return characters.map((character) => {
      const last = prints.find((print) => print.character.id === character.id)
      return {
        ...toView(character),
        lastPrint: last ? { status: last.status, rejection: last.rejection ?? null } : null,
      }
    })
  }

  async hasVerified(accountId: string): Promise<boolean> {
    const count = await this.em.fork().count(Character, {
      account: accountId,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
    })
    return count > 0
  }

  async create(accountId: string, dto: CreateCharacterDto): Promise<CharacterView> {
    if (!archetypeFitsCategory(dto.archetype, dto.category)) {
      throw new BadRequestException('archetype_category_mismatch')
    }
    const gamertagHash = hashGamertag(this.hmacSecret, dto.gamertag)

    try {
      return await this.em
        .fork()
        .transactional((em) => this.createLocked(em, accountId, dto, gamertagHash))
    } catch (error) {
      // The account lock serializes this account's writes; a violation left
      // here is the category index or the (account, platform) claim.
      if (isUniqueViolation(error)) {
        throw new ConflictException('category_taken')
      }
      throw error
    }
  }

  private async createLocked(
    em: EntityManager,
    accountId: string,
    dto: CreateCharacterDto,
    gamertagHash: string,
  ): Promise<CharacterView> {
    // One account creates one character at a time: the "inactivate the
    // previous one" step below must not race a second creation.
    const account = await lockAccount(em, accountId)

    const recent = await em.count(Character, {
      account: accountId,
      createdAt: { $gt: new Date(Date.now() - HOUR_MS) },
    })
    if (recent >= CHARACTER_CREATIONS_PER_HOUR) {
      throw new HttpException('character_create_limit', HttpStatus.TOO_MANY_REQUESTS)
    }

    // No ban-list or "already verified elsewhere" check here: typing a tag
    // proves nothing, and answering those questions to anyone who types a
    // name would tell strangers who is banned or registered. Both are
    // checked when a print proves ownership (#197, #198).
    await this.claimGamertag(em, account, dto, gamertagHash)

    // RF-027: the replaced character stays in the history, and its match
    // count carries over. Starting from zero would hand back the K-factor
    // of a new player and reopen the category change RF-028 locks.
    const previous = await em.findOne(Character, {
      account: accountId,
      category: dto.category,
      edition: CURRENT_EDITION,
      state: { $in: [...ACTIVE_CHARACTER_STATES] },
    })
    await em.nativeUpdate(
      Character,
      {
        account: accountId,
        category: dto.category,
        edition: CURRENT_EDITION,
        state: { $in: [...ACTIVE_CHARACTER_STATES] },
      },
      { state: CharacterState.INACTIVE },
    )

    const character = em.create(Character, {
      account,
      category: dto.category,
      archetype: dto.archetype,
      platform: dto.platform,
      edition: CURRENT_EDITION,
      name: dto.name,
      matchesInCategory: previous?.matchesInCategory ?? 0,
    })
    await em.flush()
    return toView(character)
  }

  async changeCategory(
    accountId: string,
    characterId: string,
    dto: ChangeCategoryDto,
  ): Promise<CharacterView> {
    try {
      return await this.em.fork().transactional(async (em) => {
        // Same lock as creation: both write the one-active-per-category index.
        await lockAccount(em, accountId)
        const character = await em.findOne(
          Character,
          { id: characterId, account: accountId, state: { $in: [...ACTIVE_CHARACTER_STATES] } },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        )
        if (!character) {
          throw new NotFoundException('character_not_found')
        }
        // RF-028: from the first match on, elo exists in that category, and
        // moving would carry performance between positions.
        if (character.matchesInCategory > 0) {
          throw new ConflictException('category_locked_after_match')
        }
        if (!archetypeFitsCategory(character.archetype, dto.category)) {
          throw new BadRequestException('archetype_category_mismatch')
        }
        character.category = dto.category
        await em.flush()
        return toView(character)
      })
    } catch (error) {
      // The partial unique index: that category already has an active one.
      if (isUniqueViolation(error)) {
        throw new ConflictException('category_taken')
      }
      throw error
    }
  }

  /**
   * The claim is provisional until a print verifies it, so fixing a typo is
   * free. Once verified, changing it is a moderation request — PSN and Xbox
   * let people rename, and that must not reopen the tag to anyone.
   */
  private async claimGamertag(
    em: EntityManager,
    account: Account,
    dto: CreateCharacterDto,
    gamertagHash: string,
  ): Promise<void> {
    const claim = await em.findOne(PlatformGamertag, { account, platform: dto.platform })
    if (claim?.verifiedAt) {
      if (claim.gamertagHash === gamertagHash) {
        return
      }
      throw new ConflictException('gamertag_change_requires_moderation')
    }
    // Rewritten even when only the case changed: the moderator reads this.
    const gamertagEncrypted = encryptAtRest(this.encryptionKey, Buffer.from(dto.gamertag))
    if (claim) {
      claim.gamertagHash = gamertagHash
      claim.gamertagEncrypted = gamertagEncrypted
      return
    }
    em.create(PlatformGamertag, {
      account,
      platform: dto.platform,
      gamertagHash,
      gamertagEncrypted,
    })
  }
}

function lockAccount(em: EntityManager, accountId: string): Promise<Account> {
  return em.findOneOrFail(Account, { id: accountId }, { lockMode: LockMode.PESSIMISTIC_WRITE })
}

function toView(character: Character): CharacterView {
  return {
    id: character.id,
    category: character.category,
    archetype: character.archetype,
    platform: character.platform,
    edition: character.edition,
    name: character.name,
    state: character.state,
    matchesInCategory: character.matchesInCategory,
  }
}
